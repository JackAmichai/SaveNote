const { JSDOM } = require("jsdom");
const fs = require("fs");

const dom = new JSDOM(`
<html><body>
<div id="main">
  <header data-sn-is-self="true">
    <div data-testid="conversation-info-header-chat-title" title="+972 54-484-4125 (You)">+972 54-484-4125 (You)</div>
  </header>
  <div data-testid="conversation-panel-body">
    <div role="row">
      <div data-id="true_123" class="message-out">
        <span class="selectable-text">where did i park my car?</span>
      </div>
    </div>
  </div>
</div>
</body></html>
`);

global.document = dom.window.document;
global.window = dom.window;
global.Node = dom.window.Node;
global.Element = dom.window.Element;
global.Navigator = dom.window.navigator;

// Mock MutationObserver
global.MutationObserver = class {
  constructor(callback) { this.callback = callback; }
  observe(node, options) { this.node = node; }
  disconnect() {}
};

const injectCode = fs.readFileSync("/Volumes/AI_Drive/Code/SaveNote/public/inject.js", "utf-8");

global.localStorage = { getItem: () => "[]", setItem: () => {} };
global.console.log = (...args) => {
    process.stdout.write("LOG: " + args.join(" ") + "\n");
};

try {
  eval(injectCode);
  
  setTimeout(() => {
    const main = dom.window.document.getElementById('main');
    
    process.stdout.write("Running processNewElements on existing...\n");
    // In inject.js, processNewElements is not global, but we can trigger it 
    // if we find where it's called or if we export it for testing.
    // However, the script runs immediately.
    
    // Inject a new row
    process.stdout.write("Injecting new row...\n");
    const panel = dom.window.document.querySelector('[data-testid="conversation-panel-body"]');
    const newRow = dom.window.document.createElement('div');
    newRow.setAttribute('role', 'row');
    newRow.innerHTML = '<div data-id="true_new" class="message-out"><span class="selectable-text">what books am I reading?</span></div>';
    panel.appendChild(newRow);
    
    // We need to manually call it because we can't easily access the internal function 
    // unless we modify inject.js to expose it for testing or just test the side effects.
    // Since it's an IIFE, we might need to expose it.
  }, 100);
} catch (e) {
  console.log("EVAL ERROR:", e);
}

setTimeout(() => { process.exit(0); }, 1000);
