import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Result, Skeleton } from 'antd';
import { useAssetByTag } from '../hooks/useAssets';

/**
 * Landing target for the asset QR code (encodes {origin}/assets/tag/{tag}).
 * Resolves the tag to the asset's real id then hands off to the normal
 * detail route — kept separate from AssetDetailPage so the primary
 * UUID-based route isn't complicated with dual lookup modes.
 */
export const AssetTagRedirectPage = () => {
  const { tag = '' } = useParams<{ tag: string }>();
  const nav = useNavigate();
  const asset = useAssetByTag(tag);

  useEffect(() => {
    if (asset.data) nav(`/assets/${asset.data.id}`, { replace: true });
  }, [asset.data, nav]);

  if (asset.isError) {
    return (
      <Result
        status="404"
        title="Asset not found"
        subTitle={`No asset with tag "${tag}".`}
      />
    );
  }

  return <Skeleton active />;
};
