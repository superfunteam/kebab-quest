import React, { useEffect, useState } from 'react';
import { MonoIcon, PixelStars, Avatar } from '../lib/sprites.jsx';
import { sfx } from '../lib/sound.js';

// Used for two flows that share the same form:
//  - LOG (post-tap): a fresh kebab, fields blank → SAVE KEBAB / SKIP.
//  - EDIT (tap a row in LOG/CHAIN): an existing kebab, fields pre-filled →
//    SAVE CHANGES / DELETE / CANCEL.
export function LogSheet({ open, theme, city, crew = [], youName, editKebab = null, onSave, onClose, onDelete }) {
  const T = theme;
  const isEdit = !!editKebab;

  const [rating, setRating] = useState(0);
  const [shop, setShop] = useState('');
  const [meat, setMeat] = useState('Chicken');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [cityField, setCityField] = useState('');
  const [ccField, setCcField] = useState('');
  const [photo, setPhoto] = useState(false);
  const [who, setWho] = useState(youName || '');
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editKebab) {
      setRating(editKebab.rating || 0);
      setShop(editKebab.shop || '');
      setMeat(editKebab.meat || 'Chicken');
      setPrice(editKebab.price ? String(editKebab.price) : '');
      setNote(editKebab.note || '');
      setCityField(editKebab.city || '');
      setCcField(editKebab.cc || '');
      setPhoto(!!editKebab.photo);
      setWho(editKebab.player || youName || '');
    } else {
      setRating(0);
      setShop('');
      setMeat('Chicken');
      setPrice('');
      setNote('');
      setCityField('');
      setCcField('');
      setPhoto(false);
      setWho(youName || (crew[0] && crew[0].name) || '');
    }
    setPickerOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editKebab && editKebab.id]);

  const label = (txt) => (
    <div
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 9,
        letterSpacing: 0.5,
        color: T.gold,
        marginBottom: 9,
        textTransform: 'uppercase',
      }}
    >
      {txt}
    </div>
  );

  const input = {
    width: '100%',
    boxSizing: 'border-box',
    background: T.bg0,
    border: '2px solid ' + T.line,
    padding: '11px 12px',
    color: T.text,
    fontSize: 18,
    fontFamily: 'var(--font-body)',
    outline: 'none',
  };

  const detailFields = () => {
    const f = {
      player: who,
      rating,
      shop: shop.trim() || 'Mystery Kebab',
      meat,
      price: parseFloat(price) || 0,
      note: note.trim(),
      photo,
    };
    if (isEdit) {
      // In edit mode always carry city/cc so they can be changed (or cleared back).
      f.city = cityField.trim() || editKebab.city || '';
      f.cc = (ccField.trim().toUpperCase() || editKebab.cc || '').slice(0, 3);
    } else {
      const c = cityField.trim();
      if (c) f.city = c;
      const cc = ccField.trim().toUpperCase();
      if (cc) f.cc = cc.slice(0, 3);
    }
    return f;
  };

  const save = () => { sfx.success(); onSave(detailFields()); };
  const skip = () => { sfx.pop(); onSave({ player: who }); }; // keep attribution, drop the extra details
  const forSomeoneElse = who && youName && who !== youName;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 150,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          opacity: open ? 1 : 0,
          transition: 'opacity .25s',
        }}
      />
      <div
        style={{
          position: 'relative',
          background: T.bg1,
          borderTop: '3px solid ' + T.gold,
          padding: '18px 18px calc(28px + var(--safe-bottom))',
          transform: open ? 'translateY(0)' : 'translateY(105%)',
          transition: 'transform .32s steps(6)',
          maxHeight: '88%',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: T.text }}>
            {isEdit ? 'EDIT KEBAB' : 'RATE IT'}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: T.green }}>
            {(cityField || city || '').toUpperCase()}
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: T.muted, marginBottom: 20 }}>
          {isEdit ? 'CHANGE ANYTHING, THEN SAVE.' : 'ALL OPTIONAL — THE TAP ALREADY SCORED.'}
        </div>

        <div style={{ marginBottom: 20 }}>
          {label('How good')}
          <PixelStars value={rating} size={30} color={T.gold} dim={T.surf2} onChange={v => { sfx.blip(); setRating(v); }} gap={8} />
        </div>

        <div style={{ marginBottom: 20 }}>
          {label('Evidence')}
          <div
            onClick={() => { sfx.boink(); setPhoto(!photo); }}
            style={{
              height: photo ? 120 : 66,
              border: '2px dashed ' + (photo ? T.green : T.line),
              background: photo
                ? `repeating-linear-gradient(45deg, ${T.surf2}, ${T.surf2} 8px, ${T.surf} 8px, ${T.surf} 16px)`
                : T.bg0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: 16,
              color: photo ? T.green : T.muted,
            }}
          >
            <MonoIcon name="pin" size={18} color={photo ? T.green : T.muted} />
            {photo ? 'KEBAB.PNG ✓' : 'ADD PHOTO'}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          {label('Where')}
          <input style={input} placeholder="Kebab shop…" value={shop} onChange={e => setShop(e.target.value)} />
        </div>

        <div style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
          <div style={{ flex: 2 }}>
            {label('City')}
            <input style={input} placeholder={city || 'City…'} value={cityField} onChange={e => setCityField(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            {label('CC')}
            <input style={input} placeholder="—" maxLength={3} value={ccField} onChange={e => setCcField(e.target.value.toUpperCase())} />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          {label('Meat (or veg)')}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Chicken', 'Beef', 'Lamb', 'Mixed', 'Veg'].map(m => (
              <div
                key={m}
                onClick={() => { sfx.blip(); setMeat(m); }}
                style={{
                  padding: '9px 13px',
                  fontSize: 15,
                  fontFamily: 'var(--font-body)',
                  cursor: 'pointer',
                  border: '2px solid ' + (meat === m ? T.gold : T.line),
                  background: meat === m ? T.gold : 'transparent',
                  color: meat === m ? T.bg0 : T.muted,
                  fontWeight: 700,
                }}
              >
                {m.toUpperCase()}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          {label('Price €')}
          <input
            style={input}
            placeholder="0.00"
            inputMode="decimal"
            value={price}
            onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
          />
        </div>

        <div style={{ marginBottom: 22 }}>
          {label('Field notes')}
          <textarea
            style={{ ...input, resize: 'none', height: 64 }}
            placeholder="How did it slap?"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        {/* WHO ATE IT — collapsed to just you; expand only to log for a friend */}
        <div style={{ marginBottom: 22 }}>
          {label('Who ate it?')}
          {!pickerOpen ? (
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 9,
                  maxWidth: '100%',
                  padding: '7px 12px 7px 7px',
                  border: '2px solid ' + T.gold,
                  background: T.surf2,
                }}
              >
                <Avatar n={(crew.find(c => c.name === who) || {}).avatar} size={28} theme={T} borderColor={T.gold} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 17, fontWeight: 700, color: T.gold, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {who || youName}{who === youName ? ' ★' : ''}
                </span>
              </div>
              <button
                onClick={() => { sfx.pop(); setPickerOpen(true); }}
                style={{
                  display: 'block',
                  background: 'none',
                  border: 'none',
                  padding: '11px 0 0',
                  color: forSomeoneElse ? T.green : T.muted,
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {forSomeoneElse ? `▶ Logging for ${who} — tap to change` : '› Need to log a kebab for a friend?'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {crew.map(c => {
                const on = c.name === who;
                const isYou = c.name === youName;
                return (
                  <button
                    key={c.name}
                    onClick={() => { sfx.blip(); setWho(c.name); setPickerOpen(false); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '5px 9px 5px 5px',
                      border: '2px solid ' + (on ? T.gold : T.line),
                      background: on ? T.surf2 : T.surf,
                      cursor: 'pointer',
                      boxShadow: on ? 'none' : `0 3px 0 ${T.bg0}`,
                    }}
                  >
                    <Avatar n={c.avatar} size={22} theme={T} borderColor={on ? T.gold : T.line} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, color: on ? T.gold : T.text }}>
                      {c.name}{isYou ? ' ★' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={save}
          style={{
            width: '100%',
            border: 'none',
            background: T.green,
            color: T.bg0,
            padding: '15px',
            fontFamily: 'var(--font-display)',
            fontSize: 12,
            cursor: 'pointer',
            boxShadow: `0 5px 0 ${T.bg0}`,
          }}
        >
          {isEdit ? 'SAVE CHANGES' : (forSomeoneElse ? `SAVE FOR ${who}` : 'SAVE KEBAB')}
        </button>

        {isEdit ? (
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button
              onClick={() => { sfx.boink(); onDelete(); }}
              style={{
                flex: 1,
                border: '2px solid ' + T.red,
                background: 'transparent',
                color: T.red,
                padding: '13px',
                fontFamily: 'var(--font-display)',
                fontSize: 10,
                cursor: 'pointer',
                boxShadow: `0 4px 0 ${T.bg0}`,
              }}
            >
              DELETE
            </button>
            <button
              onClick={() => { sfx.pop(); onClose(); }}
              style={{
                flex: 1,
                border: '2px solid ' + T.line,
                background: 'transparent',
                color: T.muted,
                padding: '13px',
                fontFamily: 'var(--font-display)',
                fontSize: 10,
                cursor: 'pointer',
                boxShadow: `0 4px 0 ${T.bg0}`,
              }}
            >
              CANCEL
            </button>
          </div>
        ) : (
          <button
            onClick={skip}
            style={{
              width: '100%',
              border: 'none',
              background: 'none',
              color: T.muted,
              padding: '16px',
              fontFamily: 'var(--font-body)',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            SKIP THE DETAILS
          </button>
        )}
      </div>
    </div>
  );
}
