/* global Dom, Log, WS, Interact, Cjs */

class Component extends HTMLElement {
  connectedCallback () {
    this.shadow = this.attachShadow({mode: 'open'});
    this.update();
  }

  update () {
    this.shadow.innerHTML = '';
    this.shadow.appendChild(this.render());
  }
}

function load () {
  const appContainer = document.getElementById('Content');

  class ViewerPage extends Component {
    constructor () {
      super();

      WS.room = 'viewer_' + Dom.location.query.get('room');
      WS.connect();
      WS.onmessage = (data) => {
        if (data.command === 'challenge_accept') {
          this.players = data.players;
        }

        if (data.command === 'player_join_accept') {
          this.players.push({name: data.name});
        }

        this.update();
      };
    }

    render () {
      return Dom.createElem('div', {
        appendChildren: [
          Dom.createElem('h1', {
            textContent: 'Waiting for game to start...'
          }),
          Dom.createElem('ul', {
            appendChildren: this.players && this.players.map(name => Dom.createElem('li', {
              appendChild: Dom.createElem('player-name', {
                name
              })
            }))
          })
        ]
      });
    }
  }

  class PlayerName extends Component {
    get color () {
      return Cjs.stringToColor(this.name);
    }

    render () {
      return Dom.createElem('div', {
        textContent: this.name,
        style: `background: #${this.color}; color: ${Cjs.getContrastingColor(this.color)};`
      });
    }
  }

  customElements.define('viewer-page', ViewerPage);
  customElements.define('player-name', PlayerName);

  appContainer.appendChild(Dom.createElem('viewer-page'));
}

document.addEventListener('DOMContentLoaded', load);