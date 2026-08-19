import { useEffect, useState } from 'react';
import { Skeleton } from 'antd';

interface Props {
  fetcher: () => Promise<Blob>;
  alt: string;
  style?: React.CSSProperties;
}

/**
 * Renders an image served behind Bearer-token auth (a plain <img src>
 * can't attach that header). Fetches the blob via the authenticated API
 * client and renders it through an object URL, revoked on unmount.
 */
export const AuthedImage = ({ fetcher, alt, style }: Props) => {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setUrl(null);
    setFailed(false);
    fetcher()
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) return <span style={{ color: '#999', fontSize: 12 }}>Failed to load</span>;
  if (!url) return <Skeleton.Image active style={{ width: 120, height: 120 }} />;
  return <img src={url} alt={alt} style={style} />;
};
