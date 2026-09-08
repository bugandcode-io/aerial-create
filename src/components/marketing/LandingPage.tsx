import { ElementIcon } from '../editor/ElementIcon';
import { DesignArtwork, EditorPreview } from './EditorPreview';
import './landing.css';

export function LandingBrand() {
  return <a href="/" className="brand" aria-label="Aerial Create home"><span className="brand-mark">A</span><span>AERIAL <b>CREATE</b></span></a>;
}
export function LandingPage({authenticated}: {authenticated:boolean}) {
  const destination=authenticated ? '/editor' : '/register';
  const action=authenticated ? 'Open editor' : 'Start creating';
  return <div className="landing">
    <a className="landing-skip" href="#main">Skip to content</a>
    <header className="landing-header"><LandingBrand /><nav aria-label="Main navigation"><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#about">About</a></nav><div className="landing-actions">{!authenticated && <a href="/login" className="landing-login">Log in</a>}<a className="landing-button primary" href={destination}>{action}<span aria-hidden="true">↗</span></a></div></header>
    <main id="main">
      <section className="landing-hero"><div className="landing-eyebrow"><span />YOUR IDEAS. YOUR WORKSPACE.</div>
        <h1>Create without limits.<br /><em>Start with a little space.</em></h1>
        <p>Turn a spark of an idea into something visual. Aerial Create brings text, shapes, and layers together in a focused design workspace, right in your browser.</p>
        <div className="landing-hero-actions"><a className="landing-button primary" href={destination}>{action}<span aria-hidden="true">↗</span></a><a className="landing-button secondary" href="#features">View features <span aria-hidden="true">↓</span></a></div>
        <div className="landing-microcopy">No installation. Just you and your next idea.</div>
        <EditorPreview />
      </section>
      <section id="features" className="landing-section"><div className="landing-section-heading"><div><p className="landing-eyebrow">ROOM TO EXPERIMENT</p><h2>The essentials.<br />With possibility built in.</h2></div><p>From the first word to the final export, keep your attention on what you’re making.</p></div>
        <div className="landing-features">
          <article><div className="landing-feature-icon"><ElementIcon type="text" /></div><h3>Make your mark</h3><p>Shape an idea with expressive type and simple geometry. Move, resize, rotate, and fine-tune it on the canvas.</p><span>TEXT & SHAPES</span></article>
          <article><div className="landing-feature-icon"><ElementIcon type="rectangle" /></div><h3>Every detail, in place</h3><p>Arrange your layers, lock what’s finished, and hide what’s next. Copy, paste, duplicate, and undo as you explore.</p><span>LAYERS & EDITING</span></article>
          <article><div className="landing-feature-icon"><ElementIcon type="arrow" /></div><h3>Pick up where you left off</h3><p>Local autosave protects your draft. Save to your account to reopen your projects from another device.</p><span>RECOVERY & ACCOUNT PROJECTS</span></article>
          <article><div className="landing-feature-icon"><ElementIcon type="circle" /></div><h3>Take your ideas with you</h3><p>Download a crisp PNG at your design’s resolution. Export and import JSON to keep an editable copy, too.</p><span>PNG & JSON EXPORT</span></article>
        </div>
      </section>
      <section id="how-it-works" className="landing-section landing-workflow"><p className="landing-eyebrow">FROM WHAT IF TO WHAT’S NEXT</p><h2>A simple flow for big ideas.</h2><div className="landing-steps">
        <article><span>01</span><h3>Create</h3><p>Make an account and open a fresh canvas. Every design starts with a little room to explore.</p></article>
        <article><span>02</span><h3>Design</h3><p>Add your words and shapes. Build up layers, try a new direction, and undo anything that doesn’t fit.</p></article>
        <article><span>03</span><h3>Save & continue anywhere</h3><p>Save the project to your account, then sign in on another device to keep creating.</p></article>
      </div></section>
      <section id="about" className="landing-section landing-product"><div className="landing-art-detail"><DesignArtwork /><span className="landing-art-note">A few shapes. A whole new perspective.</span></div><div><p className="landing-eyebrow">BUILT AROUND THE CANVAS</p><h2>A little less friction.<br /><em>A lot more you.</em></h2><p>Aerial Create is a browser-based visual editor for turning ideas into compositions. A focused canvas, familiar controls, and the freedom to try again.</p><p>Start simple. Make something yours.</p><a className="landing-text-link" href={destination}>Find your creative space <span aria-hidden="true">↗</span></a></div></section>
      <section className="landing-final"><p className="landing-eyebrow">YOUR NEXT IDEA IS WAITING</p><h2>Ready to create?</h2><p>Give it a canvas.</p><div className="landing-hero-actions"><a className="landing-button primary" href={destination}>{action}<span aria-hidden="true">↗</span></a>{!authenticated && <a className="landing-button secondary" href="/login">Log in</a>}</div></section>
    </main>
    <footer className="landing-footer"><LandingBrand /><span>© {new Date().getFullYear()} Bug and Code LLC · Aerial Create</span><nav aria-label="Legal information"><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav></footer>
  </div>;
}

export function InformationPage({kind}: {kind:'privacy'|'terms'|'not-found'}) {
  return <div className="landing landing-information"><header className="landing-header"><LandingBrand /><a href="/">Back to home ↗</a></header><main>
    <p className="landing-eyebrow">AERIAL CREATE</p><h1>{kind==='privacy'?'Privacy information':kind==='terms'?'Terms information':'Page not found'}</h1>
    {kind==='privacy'?<><p>The current application uses an email account, a password hash, a session cookie, and saved project documents. Recovery drafts are also stored locally in your browser, separated by account.</p><p>This is a product information summary. A formal privacy policy has not yet been published here.</p></>:kind==='terms'?<><p>Formal terms of service have not yet been published here.</p><p>You can export your designs as PNG images or editable JSON documents. Keep an exported copy of work you want to retain independently of the service.</p></>:<p>This page isn’t available. Return home to explore Aerial Create.</p>}
    <a className="landing-button secondary" href="/">Back to home</a>
  </main></div>;
}
