const loki = require('lokijs');
const LokiFsAdapter = require('lokijs/src/loki-fs-structured-adapter.js');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');

const logMessageTypes = Object.freeze({
    success: 'success',
    info: 'info',
    warning: 'warning',
    error: 'error',
    started: 'started',
    finished: 'finished'
});

// const { parseFile, orderTags } = require('music-metadata');

String.prototype.toAlphaNumeric = function (separator) {
    return this.replace(/[^a-zA-Z0-9]/g, separator || '');
};

String.prototype.toPlaylistName = function () {
    return this.toAlphaNumeric('-').toLowerCase().replace(/\s+/g, '');
};

Array.prototype.uniqueByProperty = function (propertyName) {
    const uniqueArray = [];
    const seenValues = new Set();
    for (let i = 0; i < this.length; i++) {
        const currentValue = this[i][propertyName];
        if (!seenValues.has(currentValue)) {
            uniqueArray.push(this[i]);
            seenValues.add(currentValue);
        }
    }
    return uniqueArray;
};

String.prototype.replaceNonAsciiWithUnderscore = function () {
    return this.replace(/[^\x00-\x7F]+/g, '_');
};

String.prototype.replaceNonAlphaNumeric = function (replacementChar) {
    const regex = /[^a-zA-Z0-9_\-\s]/g;
    return this.replace(regex, replacementChar);
};

class DataManager {
    constructor() {

        this.trackProperties = [
            'id',
            'title',
            'thumbnail',
            'channel_id',
            'channel_url',
            'duration',
            'channel',
            'upload_date',
            'asr',
            'filesize',
            'format_id',
            'format_note',
            'quality',
            'tbr',
            'abr',

            '$loki',
            'meta',
            'deleted',
            'playlists',
            'createdDate',
            'uploadDate'
        ];

    }

    setMainWindow(mainWindow) {
        this.mainWindow = mainWindow;
    }

    async init() {

        this.appFolder = path.join(process.env.USERPROFILE, 'Music', 'Beathub');

        this.dataFolder = path.join(this.appFolder, 'Data');
        this.settingsFile = path.join(this.dataFolder, 'settings.json');

        this.filesFolder = path.join(this.appFolder, 'Files');

        this.dbPath = path.join(this.dataFolder, 'data.db');

        console.info('this.appFolder', this.appFolder);
        console.info('this.dataFolder', this.dataFolder);
        console.info('this.filesFolder', this.filesFolder);
        console.info('this.dbPath', this.dbPath);

        this.settingsJson = {};

        if (!fs.existsSync(this.appFolder)) {
            await fs.promises.mkdir(this.appFolder);
        }

        if (!fs.existsSync(this.dataFolder)) {
            await fs.promises.mkdir(this.dataFolder);
        }

        if(!fs.existsSync(this.settingsFile)){
            await fs.promises.writeFile(this.settingsFile, '');
        }
        const settingsContent = await fs.promises.readFile(this.settingsFile);
        try {
            this.settingsJson = JSON.parse(settingsContent);
        } catch {}
        if(!('trackId' in this.settingsJson)){
            this.settingsJson.trackId = null;
            await fs.promises.writeFile(this.settingsFile, JSON.stringify(this.settingsJson, null, 3));
        }

        if (!fs.existsSync(this.filesFolder)) {
            await fs.promises.mkdir(this.filesFolder);
        }

        const adapter = new LokiFsAdapter();
        this.db = new loki(this.dbPath, {
            adapter
        });

        await new Promise((resolve, reject) => {
            this.db.loadDatabase({}, (error) => {
                if (error) {
                    console.error('can not load database');
                    reject(error);
                }
                else {
                    this.createCollection('tracks');
                    this.createCollection('playlists');
                    console.info('loaded database');
                    resolve();
                }
            });
        });

        return this.getMissingFiles();
    }

    getTrackIdSetting(){
        return this.settingsJson.trackId;
    }

    async setTrackIdSetting(trackId){
        this.settingsJson.trackId = trackId;
        await fs.promises.writeFile(this.settingsFile, JSON.stringify(this.settingsJson, null, 3));
        return trackId;
    }

    getMissingFiles(){
        let filter = { deleted: false };
        const tracks = this.tracks.chain().find(filter).simplesort('createdDate', true).data();

        const missingTrackFiles = [];
        for (let index = 0; index < tracks.length; index++) {
            const track = tracks[index];
            const trackPath = path.join(this.filesFolder, `${track.id}.mp3`);
            if (!fs.existsSync(trackPath)) {
                missingTrackFiles.push(track.id);
            }
        }

        return missingTrackFiles;
    }

    createCollection(collectionName) {
        this[collectionName] = this.db.getCollection(collectionName);
        if (!this[collectionName]) {
            console.info(`collection '${collectionName}' does NOT exist`);
            this[collectionName] = this.db.addCollection(collectionName, {
                indices: ['id']
            });
            console.info(`added collection '${collectionName}'`);
        }
        else {
            console.info(`collection '${collectionName}' already exists`);
        }
    }

    save() {
        return new Promise((resolve, reject) => {
            this.db.saveDatabase((error) => {
                if (error) {
                    console.error('error while saving the database');
                    reject(error);
                } else {
                    console.log('database saved successfully');
                    resolve();
                }
            });
        });
    }

    getTracks(page, size, playlistId) {

        let tracks = [];

        let filter = { deleted: false };
        if (!playlistId) {
            const offset = (page - 1) * size;
            tracks = this.tracks.chain().find(filter).simplesort('createdDate', true).offset(offset).limit(size).data();
        }
        else {
            const playlist = this.playlists.findOne({ id: playlistId });
            console.info('playlistName', playlist.name);
            if (playlist) {
                filter.playlists = { $contains: playlist.name };
                tracks = this.tracks.find(filter);

                let tmp = [];
                for (let index = 0; index < playlist.tracks.length; index++) {
                    const track = tracks.find(_ => _.id == playlist.tracks[index].id);
                    if (!track) continue;
                    tmp.push(track);
                }
                tracks = tmp;
            }
        }

        const total = this.tracks.count(filter);
        const pageCount = playlistId ? 1 : size > 0 ? total / size == 0 ? 1 : (Math.ceil(total / size)) : 1;

        const result = {
            pagination: {
                page, size, pageCount
            },
            total,
            entities: tracks
        };

        return new Promise((resolve, reject) => {
            resolve(result);
        });
    }

    getTrackPath(trackId){
        const trackPath = path.join(this.filesFolder, `${trackId}.mp3`);
        return trackPath;
    }

    getTrack(trackId) {
        const track = this.tracks.findOne({ id: trackId });
        if (!track) {
            console.warn(`track '${trackId}' not found`);
            return;
        }
        const trackPath = this.getTrackPath(trackId);
        const audioData = fs.readFileSync(trackPath);
        return audioData;
    }

    getTrackObject(trackId){
        const track = this.tracks.findOne({ id: trackId });
        return track;
    }

    getPlaylists() {
        let playlists = this.playlists.chain().find().simplesort('tracks.length', true).data();
        return new Promise((resolve, reject) => {
            resolve(playlists.sort((a, b) => b.tracks.length - a.tracks.length));
        });
    }

    async jumpToTrack(trackId, size, playlistId) {
        const track = await this.tracks.findOne({ id: trackId });
        if (!track) return null;

        const _size = playlistId ? null : size;

        const count = await this.tracks.count({
            createdDate: { $gt: track.createdDate },
            deleted: false,
        });

        return _size ? Math.floor(count / _size) + 1 : 1;
    }

    async savePlaylist(trackId, data) {
        const track = await this.tracks.findOne({ id: trackId });
        if (!track) return { status: 'not found' };

        const playlistName = data.name.toPlaylistName();
        if (!data.isDelete && !track.playlists.includes(playlistName)) {
            track.playlists.push(playlistName);
            track.playlists = [...new Set(track.playlists.sort())];
            await this.tracks.update(track);
            let playlist = await this.playlists.findOne({ name: playlistName });
            if (!playlist) {
                const createdDate = moment().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
                playlist = {
                    id: uuidv4(),
                    createdDate,
                    name: playlistName, tracks: [{
                        id: track.id,
                        tags: []
                    }]
                };
                await this.playlists.insert(playlist);
            } else {
                playlist.tracks.push({
                    id: track.id,
                    tags: []
                });
                playlist.tracks = playlist.tracks.uniqueByProperty('id');
                await this.playlists.update(playlist);
            }
        } else if (data.isDelete && track.playlists.includes(playlistName)) {
            track.playlists = track.playlists.filter(p => p !== playlistName).sort();
            await this.tracks.update(track);

            const playlist = await this.playlists.findOne({ name: playlistName });
            if (playlist) {
                playlist.tracks = playlist.tracks.filter(t => t.id !== trackId);
                if (playlist.tracks.length) {
                    await this.playlists.update(playlist);
                } else {
                    await this.playlists.remove(playlist);
                }
            }
        }

        await this.save();

        return track;
    }

    async deleteTrack(trackId) {
        const track = await this.tracks.findOne({ id: trackId });
        if (!track) {
            console.warn(`track '${trackId}' is not found`);
            return null;
        }

        if(track.playlists && track.playlists.length){
            const playlists = await this.playlists.find({ 'name': { '$in': track.playlists } });
            for (let index = 0; index < playlists.length; index++) {
                const playlist = playlists[index];
                const trackIndex = playlist.tracks.map(_ => _.id).indexOf(track.id);
                if(trackIndex < 0) continue;
                playlist.tracks.splice(trackIndex, 1);
                await this.playlists.update(playlist);
            }
        }

        track.deleted = true;
        await this.tracks.update(track);
        await this.save();

        const trackPath = this.getTrackPath(trackId);
        if (fs.existsSync(trackPath)) {
            fs.unlinkSync(trackPath);
        }

        return track;
    }

    async nextTrack(trackId) {
        const track = await this.tracks.findOne({ id: trackId });
        if (!track) return null;

        const result = await this.tracks.chain().find({ createdDate: { $lt: track.createdDate }, deleted: false }).simplesort('createdDate', true).limit(1).data();

        let nextTrack = result[0];
        if (!nextTrack) {
            const allTracks = await this.tracks.chain().find({ deleted: false }).simplesort('createdDate', true).limit(1).data();
            nextTrack = allTracks[0] || null;
        }

        return nextTrack;
    }

    async importDownloadedTracks() {

        // const tracks = this.tracks.find({ $or: [{ 'channel_id': 'UCLXM6lFu1s7MjInzUk5bfNA' }, { 'channelId': 'UCLXM6lFu1s7MjInzUk5bfNA' }] });
        // for (let index = 0; index < tracks.length; index++) {
        //     const track = tracks[index];

        //     this.tracks.remove(track);
        //     await this.save();

        //     const file = `/home/dafriskymonkey/Music/youtube/${track.id}.mp3`;
        //     if (fs.existsSync(file)) {
        //         fs.unlinkSync(file);
        //     }
        // }
        // return;

        let jsonFiles = await fs.promises.readdir('/home/dafriskymonkey/Music/youtube/');
        jsonFiles = jsonFiles.filter(file => file.endsWith('.info.json'));
        const trackIds = [];
        for (const file of jsonFiles) {
            const json = await fs.promises.readFile(`/home/dafriskymonkey/Music/youtube/${file}`);
            let info = Object.assign(JSON.parse(json));
            if (!info.duration || !info.upload_date) {
                console.info(`${file} is not an info file`);
                continue;
            }
            if (!fs.existsSync(`/home/dafriskymonkey/Music/youtube/${info.id}.mp3`)) {
                console.info(`mp3 file ${info.id}.mp3 doenst exist`);
                continue;
            }

            info = this.onlyRequiredProperties(Object.assign(info, {
                deleted: false,
                playlists: [],
                createdDate: moment.utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
                uploadDate: new Date(
                    info.upload_date.substr(0, 4),
                    info.upload_date.substr(4, 2) - 1,
                    info.upload_date.substr(6, 2)
                )
            }));

            console.info(`saving track ${info.id}`);
            trackIds.push(info.id);
            try {
                const track = await this.tracks.findOne({ id: info.id });
                if (!track) this.tracks.insert(info);
                else this.tracks.update(Object.assign(info, track));
                await fs.promises.rename(`/home/dafriskymonkey/Music/youtube/${file}`, `/home/dafriskymonkey/Music/track-infos/${file}`);
                await this.save();
                console.info(`saved ${info.id}`);
            } catch (error) {
                console.info(`failed saving ${info.id}, error`);
            }
        }

        console.info(`saved ${trackIds.length} new tracks`);
        this.sendGetTracks();
    }

    onlyRequiredProperties(og) {
        const result = Object.assign({}, og);
        for (let prop in result) {
            if (!this.trackProperties.find(_ => _ == prop)) delete result[prop];
        }
        return result;
    }

    sendGetTracks() {
        this.mainWindow.webContents.send('main:get-tracks', 666);
    }

    logMessage(target, type, text) {
        this.mainWindow.webContents.send('api:message', {
            target: target,
            text: text,
            type: type
        });
    }

    async downloadPlaylist(playlistId) {

        this.logMessage('download-playlist', logMessageTypes.started);

        const playlist = await this.playlists.findOne({ id: playlistId });
        if (!playlist || !playlist.tracks || !playlist.tracks.length) {
            console.warn(`playlist ${playlist.name} seems to be empty`);
            this.logMessage('download-playlist', logMessageTypes.warning, `playlist "${playlist.name}" seems to be empty`);
            this.logMessage('download-playlist', logMessageTypes.finished);
            return;
        }

        const playlistFolderPath = `/home/dafriskymonkey/Music/Techno-PL/${playlist.name}`;

        await fs.promises.rmdir(playlistFolderPath, { recursive: true });
        await fs.promises.mkdir(playlistFolderPath);

        const m3uPath = `${playlistFolderPath}/${playlist.name}.m3u8`;
        let m3uContent = '#EXTM3U\n';

        for (let index = 0; index < playlist.tracks.length; index++) {
            const trackId = playlist.tracks[index].id;
            const track = await this.tracks.findOne({ id: trackId });
            if (!track || track.deleted) {
                this.logMessage('download-playlist', logMessageTypes.warning, `track "${trackId}" seems to be deleted`);
                continue;
            }

            const fileName = `${track.title}`;

            try {
                await fs.promises.copyFile(`/home/dafriskymonkey/Music/youtube/${track.id}.mp3`, `${playlistFolderPath}/${fileName}.mp3`);
                this.logMessage('download-playlist', logMessageTypes.success, `copied track "${fileName}"`);
            } catch (error) {
                console.error(error);
                this.logMessage('download-playlist', logMessageTypes.warning, `track "${track.title}" doesnt exist on the disk or is inaccessible`);
                continue;
            }

            m3uContent += `${fileName}.mp3\n`;
        }

        await fs.promises.writeFile(m3uPath, m3uContent, 'utf-8');

        this.logMessage('download-playlist', logMessageTypes.success, `created playlist file "${playlist.name}"`);
        this.logMessage('download-playlist', logMessageTypes.finished);

        return playlistFolderPath;
    }

    executeYtDlp(args) {
        return new Promise((resolve, reject) => {
            const command = 'yt-dlp';
            // const args = args;
            const options = {
                cwd: this.filesFolder
            };

            const childProcess = spawn(command, args, options);

            childProcess.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
                this.mainWindow.webContents.send('yt-dlp:output', `${data}`);
            });

            childProcess.stderr.on('data', (data) => {
                console.error(`stderr: ${data}`);
                this.mainWindow.webContents.send('yt-dlp:output', `${data}`);
            });

            childProcess.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Terminal process exited with code ${code}`));
                }
            });
        });
    }

    updateYtDlp() {
        return this.executeYtDlp(['-U']);
    }

    async downloadTrack(trackId){
        const commandString = '--write-info-json -f bestaudio --audio-quality 0 --no-part --audio-format mp3 --download-archive downloaded.txt -ciwx -o %(id)s.%(ext)s -v';
        let commandArray = commandString.split(' ');
        commandArray.push(`https://www.youtube.com/watch?v=${trackId}`);
        return this.executeYtDlp(commandArray);
    }

    async dummy() {
        const mm = require('music-metadata');

        mm.parseFile('/home/dafriskymonkey/Music/youtube/ZVtqX34qiC4.mp3', { native: true })
            .then((metadata) => {
                // extract the BPM from the metadata
                const bpm = metadata.native['ID3v2.4'][0].BPM;
                console.log(`The BPM of the song is ${bpm}`);
            })
            .catch((error) => {
                console.error(error);
            });

    }


}

module.exports = DataManager;
