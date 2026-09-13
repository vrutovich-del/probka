import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { Cap3D, type CapTexture } from '../components/Cap3D';
import { Icon } from '../components/Icon';
import { cx } from '../components/cx';
import type { CutoutResult } from '../cutout/types';
import { useT } from '../i18n/useT';
import { useObjectUrl } from '../lib/objectUrl';
import { useReducedMotion } from '../lib/reducedMotion';
import { RequireStep, useAddFlow } from './AddFlow';
import styles from './RevealScreen.module.css';

/** Timeline from the design system: drop 0.6 s → tier chip at +0.3 s → badges at +0.45 s. */
const SETTLE_MS = 620;
const TIER_MS = 920;
const BADGES_MS = 1550;

function texture(url: string | null, cut: CutoutResult | null): CapTexture | null {
  if (!url) return null;
  return cut ? { url, width: cut.stats.width, height: cut.stats.height, bbox: cut.stats.bbox } : { url, width: 0, height: 0, bbox: null };
}

/** Screen 18. Badges are computed from item 4 on; the stack renders whatever it is given (nothing yet). */
export function RevealScreen() {
  const { t } = useT();
  const { state, reset } = useAddFlow();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<'drop' | 'settle' | 'tier' | 'badges'>(reduced ? 'badges' : 'drop');

  const topCut = state.useCutout ? state.topCut : null;
  const topUrl = useObjectUrl(topCut ? topCut.cutout : state.top);
  const sideUrl = useObjectUrl(state.sideCut?.cutout);
  const top = texture(topUrl, topCut);
  const side = texture(sideUrl, state.sideCut);

  useEffect(() => {
    if (reduced) return;
    const timers = [
      setTimeout(() => setPhase('settle'), SETTLE_MS),
      setTimeout(() => setPhase('tier'), TIER_MS),
      setTimeout(() => setPhase('badges'), BADGES_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reduced]);

  const showTier = phase === 'tier' || phase === 'badges';
  const showBadges = phase === 'badges';
  const newBadges: string[] = [];

  const addAnother = () => {
    reset();
    navigate('/add/top', { replace: true });
  };

  return (
    <RequireStep when={state.savedCapId !== null && state.top !== null}>
      <div className={styles.screen}>
        <h1 className={styles.title}>{t('reveal.new')}</h1>
        <div className={styles.stage}>
          {top && (
            <div className={cx(styles.drop, reduced && styles.fade)}>
              <Cap3D top={top} side={side} sideColor={topCut?.stats.rimColor} radius={74} auto={phase !== 'drop'} autoSpeed={0.45} />
            </div>
          )}
        </div>
        <div className={styles.pedestal} />
        {showTier && (
          <div className={cx(styles.tier, !reduced && styles.tierPop)}>
            <Icon name="unrated" size={14} />
            <span>{t('reveal.unrated')}</span>
          </div>
        )}
        {showBadges &&
          newBadges.map((name, i) => (
            <div key={name} className={cx(styles.badge, !reduced && styles.badgeIn)} style={{ animationDelay: `${i * 80}ms` }}>
              <span className={styles.badgeStar}>★</span>
              <span>{t('reveal.badge', { name })}</span>
            </div>
          ))}
        {showTier && (
          <div className={cx(styles.actions, !reduced && styles.badgeIn)}>
            <Button size="sm" className={styles.action} onClick={() => navigate('/garage', { replace: true })}>
              {t('reveal.view')}
            </Button>
            <Button variant="outline" size="sm" className={styles.action} onClick={addAnother}>
              {t('reveal.again')}
            </Button>
          </div>
        )}
      </div>
    </RequireStep>
  );
}
