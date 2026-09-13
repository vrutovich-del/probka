import { useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { ChoiceChips } from '../components/ChoiceChips';
import { BackLink, Screen, ScreenTitle, Spacer } from '../components/Screen';
import { knownBrands } from '../db/caps';
import type { CapShape } from '../db/db';
import { useT } from '../i18n/useT';
import { regions } from '../lib/regions';
import { RequireStep, useAddFlow } from './AddFlow';
import styles from './ManualEntryScreen.module.css';

const SHAPES: CapShape[] = ['crown', 'aluminium', 'plastic', 'other'];

/** Screen 16 plus the country the brief asks for. Brand suggestions come from the garage itself. */
export function ManualEntryScreen() {
  const { t, lang } = useT();
  const { state, identify } = useAddFlow();
  const navigate = useNavigate();
  const [brand, setBrand] = useState(state.type?.brand ?? '');
  const [product, setProduct] = useState(state.type?.product ?? '');
  const [shape, setShape] = useState<CapShape | null>(state.type?.shape ?? null);
  const [country, setCountry] = useState(state.type?.country ?? '');
  const [brands, setBrands] = useState<string[]>([]);
  const listId = useId();

  useEffect(() => {
    void knownBrands().then(setBrands).catch(() => setBrands([]));
  }, []);

  const canSave = brand.trim() !== '' || product.trim() !== '';

  const save = () => {
    identify({ brand: brand.trim() || null, product: product.trim(), shape, country: country || null });
    navigate('/add/condition');
  };

  return (
    <RequireStep when={state.processed}>
      <Screen variant="flow">
        <BackLink to="/add/identify" labelKey="manual.back" />
        <ScreenTitle size="pushed">{t('manual.title')}</ScreenTitle>

        <label className={styles.field}>
          <span className={styles.label}>{t('manual.fields.brand')}</span>
          <input
            className={styles.input}
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder={t('manual.brandPlaceholder')}
            list={listId}
            autoComplete="off"
            autoCapitalize="words"
          />
          <datalist id={listId}>
            {brands.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{t('manual.fields.product')}</span>
          <input
            className={styles.input}
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder={t('manual.productPlaceholder')}
            autoComplete="off"
            autoCapitalize="sentences"
          />
        </label>

        <div className={styles.field}>
          <span className={styles.label}>{t('manual.fields.shape')}</span>
          <ChoiceChips choices={SHAPES.map((s) => ({ value: s, label: t(`manual.geo.${s}`) }))} value={shape} onChange={setShape} />
        </div>

        <label className={styles.field}>
          <span className={styles.label}>{t('manual.fields.country')}</span>
          <span className={styles.selectWrap}>
            <select className={styles.select} value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">{t('manual.countryNone')}</option>
              {regions(lang).map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
            <span className={styles.selectChevron}>›</span>
          </span>
        </label>

        <Spacer />
        <Button block disabled={!canSave} onClick={save}>
          {t('manual.save')}
        </Button>
      </Screen>
    </RequireStep>
  );
}
