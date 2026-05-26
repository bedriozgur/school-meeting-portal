import QRCode from "qrcode";

type QrCodeOptions = {
  size?: number;
};

export async function createQrCodeDataUrl(
  value: string,
  options: QrCodeOptions = {},
) {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: "M",
    margin: 2,
    scale: 8,
    width: options.size ?? 320,
  });
}

export function downloadQrDataUrl(params: {
  dataUrl: string;
  filename: string;
}) {
  const { dataUrl, filename } = params;
  const anchor = document.createElement("a");

  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
