import Noty from 'noty';

export class ToastsHandler {

    success(text) {
        this.show(text, 'success', 'sunset');
    }

    info(text) {
        this.show(text, 'info', 'sunset');
    }

    warning(text) {
        this.show(text, 'warning', 'sunset');
    }

    error(text) {
        this.show(text, 'error', 'sunset');
    }

    show(text, type, theme) {
        new Noty({
            text: text ?? 'your text or html here',
            type: type ?? 'info',
            theme: theme ?? 'nest',
            // theme: 'sunset',
            // theme: 'semanticui',
            // theme: 'metroui',
            layout: 'topRight',
            timeout: 2000
        }).show();
    }

    // this.show(`asfsggrwger`, 'alert', 'sunset');

}