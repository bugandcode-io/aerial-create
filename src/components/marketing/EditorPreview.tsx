import { ElementIcon } from '../editor/ElementIcon';

export function DesignArtwork() {
  return <svg viewBox="0 0 600 600" role="img" aria-label="Example poster: Make some space, with violet and blue geometric shapes">
    <rect width="600" height="600" fill="#f2eee6" />
    <circle cx="478" cy="147" r="155" fill="#bfa9f0" />
    <circle cx="478" cy="147" r="89" fill="#f2eee6" />
    <path d="M310 600V420H490V240H600V600Z" fill="#5864eb" />
    <circle cx="530" cy="526" r="29" fill="#c9f374" />
    <text x="40" y="51" fontFamily="Arial" fontSize="13" letterSpacing="4" fill="#333141">A LITTLE ROOM FOR BIG IDEAS</text>
    <g fontFamily="Arial" fontSize="100" fontWeight="bold" letterSpacing="-6" fill="#242134">
      <text x="34" y="245">MAKE</text><text x="34" y="340">SOME</text><text x="34" y="435">SPACE.</text>
    </g>
    <path d="M42 493H208M193 481L208 493L193 505" fill="none" stroke="#242134" strokeWidth="2" />
    <text x="40" y="559" fontFamily="Arial" fontSize="13" fill="#333141">A NEW PERSPECTIVE STARTS HERE.</text>
  </svg>;
}

export function EditorPreview() {
  return <figure className="landing-preview">
    <div className="preview-window" aria-hidden="true">
      <div className="preview-top"><span className="preview-brand">A <b>AERIAL CREATE</b></span><span>Make some space</span><span className="preview-top-actions">↶　↷ <b>Download PNG</b></span></div>
      <div className="preview-body">
        <div className="preview-rail"><span>▦<small>Design</small></span><span>◇<small>Elements</small></span><span className="preview-active">T<small>Text</small></span><span>↑<small>Uploads</small></span><span>▧<small>Photos</small></span></div>
        <div className="preview-tools"><strong>Text</strong><small>YOUR TOOLBOX</small><p>Good design starts with a few words.</p><div className="preview-add">+ Add a text box</div><div className="preview-preset">Add a heading <span>+</span></div><div className="preview-preset">Add a subheading <span>+</span></div><div className="preview-preset">Add body text <span>+</span></div><p className="preview-tip">Make it yours.<br />A little space for big ideas.</p></div>
        <div className="preview-workspace"><div className="preview-page-label">Page 1 — Make some space <span>1080 × 1080</span></div><div className="preview-art"><DesignArtwork /></div><small>Drag to move · Handles to resize · Top handle to rotate</small></div>
        <div className="preview-properties"><strong>Layers</strong><small>Front at top</small>{(['Heading','Circle','Rectangle'] as const).map((name,i)=><div className={i===0?'preview-layer selected':'preview-layer'} key={name}><ElementIcon type={i===0?'text':i===1?'circle':'rectangle'} />{name}<span>◉</span></div>)}<strong>Text properties</strong><small>Font</small><div className="preview-field">Arial</div><small>Font size</small><div className="preview-field">100</div><small>Style</small><div className="preview-field"><b>B</b>　<i>I</i></div><small>Text color</small><div className="preview-field">■　#242134</div></div>
      </div>
    </div>
    <figcaption>Editor preview · A design made with text and shapes</figcaption>
  </figure>;
}
