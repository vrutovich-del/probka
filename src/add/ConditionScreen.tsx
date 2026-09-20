import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { ChoiceChips } from '../components/ChoiceChips';
import { Screen, ScreenTitle, Spacer } from '../components/Screen';
import { saveCap, type CapPhotoInput } from '../db/caps';
import { db, type Condition } from '../db/db';
import { useT } from '../i18n/useT';
import { newlyEarned } from '../lib/badges';
import { todayIso } from '../lib/format';
import { useObjectUrl } from '../lib/objectUrl';
import { makeThumb } from '../lib/thumb';
import { RequireStep, useAddFlow } from './AddFlow';
import styles from './ConditionScreen.module.css';

const CONDITIONS: Condition[] = ['mint', 'worn', 'dented', 'dirty'];

/** Screen 17: condition, date and a place in the child's own words. Saving writes the cap and its photos. */
export function ConditionScreen() {
  const { t } = useT();
  const { state, saved } = useAddFlow();
  const navigate = useNavigate();
  const [condition, setCondition] = useState<Condition>('worn');
  const [foundOn, setFoundOn] = useState(todayIso);
  const [place, setPlace] = useState('');
  const [saving, setSaving] = useState(false);
  const thumbUrl = useObjectUrl(state.useCutout ? state.topCut?.thumb : state.top);

  const title = state.type
    ? [state.type.brand, state.type.product].filter((s) => s && s.trim() !== '').join(' · ')
    : t('identify.unidentified');

  const add = async () => {
    if (!state.top || saving) return;
    setSaving(true);
    const useCutout = state.useCutout && state.topCut !== null;
    const photos: CapPhotoInput[] = [{ role: 'top', original: state.top, cutout: useCutout ? state.topCut : null }];
    if (state.side) photos.push({ role: 'side', original: state.side, cutout: state.sideCut });
    try {
      // Badges are read off the garage, so what this cap unlocked is the difference across the write.
      const before = await db.caps.toArray();
      // The tile image: the cutout's thumb, or a small copy of the original when the photo is kept as is.
      const thumb = useCutout && state.topCut ? state.topCut.thumb : await makeThumb(state.top).catch(() => null);
      const id = await saveCap({
        type: state.type ?? { brand: null, product: '', shape: null, country: null },
        condition,
        foundOn,
        place,
        useCutout,
        photos,
        thumb,
      });
      saved(id, newlyEarned(before, await db.caps.toArray()));
      navigate('/add/reveal', { replace: true });
    } catch (error) {
      // The storage-full state arrives with item 6; until then the failure is visible in the console only.
      console.error('Could not save the cap', error);
      setSaving(false);
    }
  };

  return (
    <RequireStep when={state.identified}>
      <Screen variant="flow" className={styles.screen}>
        <ScreenTitle size="pushed">{t('condition.title')}</ScreenTitle>

        <div className={styles.pending}>
          <span className={styles.thumb}>{thumbUrl && <img src={thumbUrl} alt="" draggable={false} />}</span>
          <span className={styles.pendingText}>
            <span className={styles.pendingTitle}>{title}</span>
            <span className={styles.pendingSub}>{t('condition.pendingUnrated')}</span>
          </span>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>{t('condition.note')}</span>
          <ChoiceChips
            choices={CONDITIONS.map((c) => ({ value: c, label: t(`condition.tags.${c}`) }))}
            value={condition}
            onChange={setCondition}
          />
        </div>

        <label className={styles.dateRow}>
          <span className={styles.label}>{t('condition.foundOn')}</span>
          <input className={styles.date} type="date" value={foundOn} max={todayIso()} onChange={(e) => setFoundOn(e.target.value || todayIso())} />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{t('condition.place')}</span>
          <input
            className={styles.input}
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder={t('condition.placePlaceholder')}
            autoComplete="off"
          />
        </label>

        <Spacer />
        <Button block disabled={saving} onClick={() => void add()}>
          {t('condition.cta')}
        </Button>
      </Screen>
    </RequireStep>
  );
}
