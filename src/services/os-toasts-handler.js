import toastr from 'toastr';

export class ToastsHandler {
  constructor() {
    toastr.options = {
      "closeButton": true,
      "debug": false,
      "newestOnTop": false,
      "progressBar": false,
      "positionClass": "toast-bottom-center",
      "preventDuplicates": true,
      "onclick": null,
      "showDuration": "300",
      "hideDuration": "1000",
      "timeOut": "5000",
      "extendedTimeOut": "1000",
      "showEasing": "swing",
      "hideEasing": "linear",
      "showMethod": "fadeIn",
      "hideMethod": "fadeOut"
    };
  }

  success(message) {
    toastr.success(message);
  }

  error(errors) {
    if (!errors || !errors.length) return;
    let message = errors[0];
    for (let i = 1; i < errors.length; i++) {
      message += '<br /> ' + errors[i];
    }
    toastr.error(message);
  }

  info(message) {
    toastr.remove();
    toastr.info(message);
  }

  warning(message) {
    toastr.warning(message);
  }
}
