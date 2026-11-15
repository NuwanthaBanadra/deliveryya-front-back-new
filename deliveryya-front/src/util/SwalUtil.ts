import Swal from "sweetalert2";

export type AlertType = 'success' | 'warning' | 'error' | 'info';

const alertThemes: Record<AlertType, {
    icon: 'success' | 'warning' | 'error' | 'info';
    background: string;
    iconColor: string;
    color: string;
    border: string;
    progressFrom: string;
    progressTo: string;
}> = {
    success: {
        icon: 'success',
        background: '#FAFFFE',
        iconColor: '#16A34A',
        color: '#1A1F3A',
        border: '1px solid #bbf7d0',
        progressFrom: '#22C55E',
        progressTo: '#16A34A',
    },
    warning: {
        icon: 'warning',
        background: '#FFFBF0',
        iconColor: '#AC6C2A',
        color: '#1A1F3A',
        border: '1px solid #F59B0F55',
        progressFrom: '#F59B0F',
        progressTo: '#AC6C2A',
    },
    error: {
        icon: 'error',
        background: '#FFF8F4',
        iconColor: '#FF6B35',
        color: '#1A1F3A',
        border: '1px solid #FF8C4255',
        progressFrom: '#FF6B35',
        progressTo: '#AC6C2A',
    },
    info: {
        icon: 'info',
        background: '#FFFDF5',
        iconColor: '#F59B0F',
        color: '#1A1F3A',
        border: '1px solid #F59B0F44',
        progressFrom: '#F59B0F',
        progressTo: '#AC6C2A',
    },
};

export const swalConfirm = async (
  title: string,
  message: string,
  confirmText = 'OK',
  cancelText = 'Cancel',
): Promise<boolean> => {
  const result = await Swal.fire({
    icon: 'warning',
    title,
    text: message,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: '#EF4444',
    cancelButtonColor: '#6B7280',
    background: '#FFFBF0',
    color: '#1A1F3A',
    customClass: {
      popup: 'rounded-2xl shadow-2xl',
    },
  });
  return result.isConfirmed;
};

export const swalAlert = async (title: string, message: string, type: AlertType = 'info') => {
    const theme = alertThemes[type] ?? alertThemes.info;

    await Swal.fire({
        icon: theme.icon,
        title: title,
        text: message,
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 3500,
        timerProgressBar: true,
        background: theme.background,
        color: theme.color,
        iconColor: theme.iconColor,
        customClass: {
            popup: 'rounded-2xl shadow-2xl',
            timerProgressBar: `bg-gradient-to-r from-[${theme.progressFrom}] to-[${theme.progressTo}]`,
        },
        didOpen: (popup) => {
            popup.style.border = theme.border;
            popup.style.boxShadow = `0 8px 32px rgba(245,155,15,0.15), 0 2px 8px rgba(0,0,0,0.08)`;
        },
    });
};

export const swalErrorModal = async (title: string, message: string) => {
    const theme = alertThemes.error;
    await Swal.fire({
        icon: theme.icon,
        title: title,
        text: message,
        toast: false,
        position: 'center',
        showConfirmButton: true,
        confirmButtonText: 'Okay',
        confirmButtonColor: '#EF4444',
        background: theme.background,
        color: theme.color,
        iconColor: theme.iconColor,
        customClass: {
            popup: 'rounded-2xl shadow-2xl',
        }
    });
};