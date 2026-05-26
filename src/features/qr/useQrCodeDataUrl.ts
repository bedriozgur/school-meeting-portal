import { useEffect, useState } from "react";
import { createQrCodeDataUrl } from "./qrCode";

type QrCodeState = {
  dataUrl: string;
  loading: boolean;
};

export function useQrCodeDataUrl(targetUrl: string | null, size?: number) {
  const [state, setState] = useState<QrCodeState>({
    dataUrl: "",
    loading: Boolean(targetUrl),
  });

  useEffect(() => {
    let isCurrent = true;

    if (!targetUrl) {
      setState({ dataUrl: "", loading: false });
      return () => {
        isCurrent = false;
      };
    }

    setState({ dataUrl: "", loading: true });

    createQrCodeDataUrl(targetUrl, { size })
      .then((dataUrl) => {
        if (!isCurrent) {
          return;
        }

        setState({ dataUrl, loading: false });
      })
      .catch(() => {
        if (!isCurrent) {
          return;
        }

        setState({ dataUrl: "", loading: false });
      });

    return () => {
      isCurrent = false;
    };
  }, [size, targetUrl]);

  return state;
}
