const loki = require('lokijs');
const LokiFsAdapter = require('lokijs/src/loki-fs-structured-adapter.js');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

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

class DataManager {
    constructor() {
        const adapter = new LokiFsAdapter();
        this.db = new loki('./data/data.db', {
            adapter
        });

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

    async importData() {
        const json = fs.readFileSync('./data/data.json', 'utf-8');
        const data = JSON.parse(json);

        const tracks = data.tracks;
        const playlists = data.playlists;

        this.tracks.insert(tracks);
        this.playlists.insert(playlists);

        await this.save();

        return data;
    }

    init(mainWindow) {
        return new Promise((resolve, reject) => {
            this.db.loadDatabase({}, (error) => {
                if (error) {
                    console.error('can not load database');
                    reject(error);
                }
                else {
                    this.createCollection('tracks');
                    this.createCollection('playlists');
                    console.info('loaded database');
                    this.mainWindow = mainWindow;
                    resolve();
                }
            });
        });
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
            if (playlist) {
                filter.playlists = { $contains: playlist.name };
                tracks = this.tracks.find(filter);
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

    getTrack(trackId) {
        const track = this.tracks.find({ id: trackId });
        if (!track) {
            console.warn(`track '${trackId}' not found`);
            return;
        }
        const audioData = fs.readFileSync(`/home/dafriskymonkey/Music/youtube/${trackId}.mp3`)
        return audioData;
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
                playlist = {
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

        track.deleted = true;
        await this.tracks.update(track);
        await this.save();

        const file = `/home/dafriskymonkey/Music/youtube/${trackId}.mp3`;
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
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

    sendGetTracks(){
        this.mainWindow.webContents.send('main:get-tracks', 666);
    }

    async dummy() {

        const tracks = this.tracks.find();
        for (let index = 0; index < tracks.length; index++) {
            const track = tracks[index];
            for (let prop in track) {
                if (!this.trackProperties.find(_ => _ == prop)) delete track[prop];
            }
            this.tracks.update(track);
        }

        await this.save();
    }


}

module.exports = DataManager;