import { useState } from 'react';
import { ElementsPanel } from './ElementsPanel';
import { useEditorStore } from '../../store/editorStore';
import { Icon, type IconName } from './Icon';
const tools: {
    name: string;
    icon: IconName;
}[] = [{ name: 'Design', icon: 'design' }, { name: 'Elements', icon: 'elements' }, { name: 'Text', icon: 'text' }, { name: 'Uploads', icon: 'uploads' }, { name: 'Photos', icon: 'photos' }, { name: 'Background', icon: 'background' }];
export function Sidebar() {
    const [active, setActive] = useState('Text');
    const addText = useEditorStore((state) => state.addText);
    return <>
      <nav className="tool-rail" aria-label="Editor tools">
        {tools.map((tool) => <button
          key={tool.name}
          className={active === tool.name ? 'tool active' : 'tool'}
          aria-pressed={active === tool.name}
          onClick={() => setActive(tool.name)}>
          <Icon name={tool.icon}/>
          <span>
            {tool.name}
          </span>
        </button>)}
        <span className="rail-bottom">AC
          <span>STUDIO</span>
        </span>
      </nav>
      <aside className="tool-panel">
        <div className="panel-heading">
          <h1>
            {active}
          </h1>
          <span className="tiny-label">YOUR TOOLBOX</span>
        </div>
        {active === 'Text' ? <>
          <p className="panel-description">Good design starts with a few words.</p>
          <button className="add-text-button" onClick={() => addText('body')}>
            <span>+</span> Add a text box</button>
          <div className="section-label">TEXT ESSENTIALS</div>
          <div className="text-presets">
            <button className="heading-preset" onClick={() => addText('heading')}>Add a heading
              <span>+</span>
            </button>
            <button className="subheading-preset" onClick={() => addText('subheading')}>Add a subheading
              <span>+</span>
            </button>
            <button className="body-preset" onClick={() => addText('body')}>Add body text
              <span>+</span>
            </button>
          </div>
          <div className="text-tip">
            <span className="tip-symbol">T
              <span>✦</span>
            </span>
            <strong>Make it yours.</strong>
            <p>Add text, then select it to change the words, style, and color.</p>
          </div>
          <div className="panel-footer">
            <span className="status-dot"/> A little space for big ideas.</div>
        </> : active === 'Elements' ? <ElementsPanel /> : <div className="coming-soon">
          <Icon name={tools.find((tool) => tool.name === active)!.icon}/>
          <h2>Your next creative possibilities.</h2>
          <p>
            {active} tools are coming in a future milestone. Start creating with text today.</p>
          <button onClick={() => setActive('Text')}>Explore text
            <span>→</span>
          </button>
        </div>}
      </aside>
    </>;
}


