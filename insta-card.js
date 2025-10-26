/**
 * Copyright 2025 hamzaharafat37-cyber
 * @license Apache-2.0, see LICENSE for full text.
 */
import { LitElement, html, css } from "lit";
import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";
import { I18NMixin } from "@haxtheweb/i18n-manager/lib/I18NMixin.js";

const FOX_API = "https://randomfox.ca/floof/";

export class InstaCard extends DDDSuper(I18NMixin(LitElement)) {

  static get tag() {
    return "insta-card";
  }

  static get properties() {
    return {
      title: { type: String },
      image: { type: String, reflect: true },
      link: { type: String },
      author: { type: String },
      channel: { type: String, attribute: "channel" },
      dateTaken: { type: String, attribute: "date-taken" },

      // UI / state
      visible: { type: Boolean, state: true },
      loading: { type: Boolean, state: true },
      error: { type: String, state: true },

      // interactions
      likes: { type: Number },
      dislikes: { type: Number },
      saved: { type: Boolean },
      userReact: { type: String }, // 'like' | 'dislike' | ''
    };
  }

  constructor() {
    super();
    this.title = "Insta Card";
    this.author = "RandomFox";
    this.channel = "floof";
    this.dateTaken = new Date().toISOString();
    this.image = "";
    this.link = "";

    this.loading = true;
    this.error = "";
    this.visible = false;

    this.likes = 0;
    this.dislikes = 0;
    this.saved = false;
    this.userReact = "";

    this._io = null;

    this.registerLocalization({
      context: this,
      localesPath:
        new URL("./locales/insta-card.ar.json", import.meta.url).href.replace(
          /insta-card\.ar\.json$/,
          ""
        ),
      locales: ["ar", "es", "hi", "zh"],
    });
  }

  connectedCallback() {
    super.connectedCallback();
    // conditional render: only load when visible
    this._io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !this.visible) {
            this.visible = true;
            this._hydrateFromStorage();
            this._fetchFox();
            this._io?.disconnect();
          }
        });
      },
      { rootMargin: "256px" }
    );
    this._io.observe(this);
  }

  disconnectedCallback() {
    this._io?.disconnect();
    super.disconnectedCallback();
  }

  get storageKey() {
    // key is stable even if image changes (use link if present)
    return `insta-card:${this.image || "pending"}`;
  }

  _hydrateFromStorage() {
    // Load generic user prefs (last card state)
    const global = localStorage.getItem("insta-card:global");
    if (global) {
      try {
        const g = JSON.parse(global);
        this.saved = !!g.saved;
      } catch (_) {}
    }
  }

  _persist() {
    // Save per-image reaction
    if (this.image) {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify({
          likes: this.likes,
          dislikes: this.dislikes,
          userReact: this.userReact,
          saved: this.saved,
        })
      );
    }
    // Save global “saved” preference too (nice UX touch)
    localStorage.setItem(
      "insta-card:global",
      JSON.stringify({ saved: this.saved })
    );
  }

  async _fetchFox() {
    try {
      this.loading = true;
      this.error = "";
      const res = await fetch(FOX_API, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json(); // { image, link }
      this.image = data.image;
      this.link = data.link || "https://randomfox.ca/";
      // try to restore reactions for this image
      const prior = localStorage.getItem(this.storageKey);
      if (prior) {
        const p = JSON.parse(prior);
        this.likes = p.likes ?? 0;
        this.dislikes = p.dislikes ?? 0;
        this.userReact = p.userReact ?? "";
        this.saved = !!p.saved;
      } else {
        this.likes = 0;
        this.dislikes = 0;
        this.userReact = "";
      }
    } catch (e) {
      this.error = "Failed to load fox image.";
      console.error(e);
    } finally {
      this.loading = false;
      this._persist();
    }
  }

  // interactions
  _toggleSave() {
    this.saved = !this.saved;
    this._persist();
  }
  _react(type) {
    // toggle behavior
    if (this.userReact === type) {
      // undo
      if (type === "like") this.likes = Math.max(0, this.likes - 1);
      if (type === "dislike") this.dislikes = Math.max(0, this.dislikes - 1);
      this.userReact = "";
    } else {
      // switch reaction
      if (type === "like") {
        if (this.userReact === "dislike")
          this.dislikes = Math.max(0, this.dislikes - 1);
        this.likes += 1;
        this.userReact = "like";
      } else {
        if (this.userReact === "like")
          this.likes = Math.max(0, this.likes - 1);
        this.dislikes += 1;
        this.userReact = "dislike";
      }
    }
    this._persist();
  }
  async _share() {
    const shareData = {
      title: "Cute fox 🦊",
      text: "Check out this fox from randomfox.ca",
      url: this.link || this.image,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(shareData.url);
    } catch (_) {
      
    }
  }
  _refresh() {
    //get a new fox
    this._fetchFox();
  }

  render() {
    //Conditional rendering as requested: only render when visible
    if (!this.visible) return html``;

    return html`
      <article class="card" part="card">
        <header class="hdr">
          <div class="avatar">🦊</div>
          <div class="meta">
            <div class="author">@${this.author}</div>
            <div class="sub">
              ${this.channel} • ${new Date(this.dateTaken).toLocaleDateString()}
            </div>
          </div>
          <button class="save ${this.saved ? "on" : ""}" @click=${this._toggleSave}
            aria-label="Save">
            ${this.saved ? "★" : "☆"}
          </button>
        </header>

        ${this.loading
          ? html`<div class="skeleton" aria-busy="true">Loading…</div>`
          : this.error
          ? html`<div class="error">${this.error}</div>`
          : html`
              <a class="imgwrap" href=${this.link} target="_blank" rel="noopener">
                <img src=${this.image} alt="Random fox image" loading="lazy" />
              </a>
            `}

        <footer class="ftr">
          <div class="actions">
            <button
              class="btn ${this.userReact === "like" ? "active" : ""}"
              @click=${() => this._react("like")}
              aria-pressed=${this.userReact === "like" ? "true" : "false"}
              title="Like"
            >
              ❤️ ${this.likes}
            </button>
            <button
              class="btn ${this.userReact === "dislike" ? "active" : ""}"
              @click=${() => this._react("dislike")}
              aria-pressed=${this.userReact === "dislike" ? "true" : "false"}
              title="Dislike"
            >
              👎 ${this.dislikes}
            </button>
            <button class="btn" @click=${this._share} title="Share">
              ↗︎ Share
            </button>
            <button class="btn ghost" @click=${this._refresh} title="New fox">
              🔄 New
            </button>
          </div>
          <div class="caption">
            <strong>randomfox</strong> A new fox each refresh. Click image for
            source.
          </div>
        </footer>
      </article>
    `;
  }

  static get styles() {
    //Uses DDD tokens where available; falls back to CSS vars
    return [
      super.styles,
      css`
        :host {
          display: block;
          max-width: 540px;
          margin: 0 auto;
          color: var(--ddd-theme-default-text, var(--insta-text, #111));
          --card-bg: var(--ddd-theme-default-white, #fff);
          --card-bg-dark: var(--ddd-theme-default-slateLight, #111);
          --muted: var(--ddd-theme-default-navyLight, #666);
          --ring: 0 0 0 1px color-mix(in oklab, currentColor 20%, transparent);
        }
        @media (prefers-color-scheme: dark) {
          :host {
            color: var(--ddd-theme-default-wyomingNight, #e8e8e8);
          }
        }
        .card {
          background: var(--card-bg);
          border-radius: var(--ddd-radius-2xl, 16px);
          box-shadow: var(
            --ddd-shadow-2,
            0 10px 20px rgba(0, 0, 0, 0.12),
            0 3px 6px rgba(0, 0, 0, 0.08)
          );
          overflow: hidden;
          border: 1px solid
            color-mix(in oklab, currentColor 12%, transparent);
        }
        @media (prefers-color-scheme: dark) {
          .card {
            background: var(--card-bg-dark);
          }
        }
        .hdr {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 12px 14px;
        }
        .avatar {
          inline-size: 40px;
          block-size: 40px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: color-mix(in oklab, currentColor 10%, transparent);
          box-shadow: var(--ring);
        }
        .meta {
          line-height: 1.2;
          flex: 1;
          min-width: 0;
        }
        .author {
          font-weight: 700;
          font-size: 0.95rem;
        }
        .sub {
          color: var(--muted);
          font-size: 0.8rem;
        }
        .save {
          border: none;
          background: transparent;
          font-size: 1.25rem;
          cursor: pointer;
          transition: transform 0.12s ease;
        }
        .save.on {
          color: #ffb400;
          transform: scale(1.05);
        }

        .imgwrap {
          display: block;
          background: color-mix(in oklab, currentColor 4%, transparent);
        }
        img {
          display: block;
          inline-size: 100%;
          block-size: auto;
          aspect-ratio: 4 / 3;
          object-fit: cover;
        }
        .skeleton {
          height: clamp(220px, 40vw, 420px);
          display: grid;
          place-items: center;
          background: repeating-linear-gradient(
            90deg,
            color-mix(in oklab, currentColor 6%, transparent) 0 20%,
            transparent 20% 40%
          );
          animation: shimmer 1.2s linear infinite;
          color: var(--muted);
        }
        @keyframes shimmer {
          to {
            background-position: 200% 0;
          }
        }
        .error {
          padding: 16px;
          color: #b00020;
        }

        .ftr {
          padding: 10px 14px 14px;
          display: grid;
          gap: 8px;
        }
        .actions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        .btn {
          border: 1px solid color-mix(in oklab, currentColor 18%, transparent);
          background: transparent;
          padding: 6px 10px;
          border-radius: 999px;
          cursor: pointer;
          font: inherit;
        }
        .btn.active {
          background: color-mix(in oklab, currentColor 10%, transparent);
        }
        .btn.ghost {
          border-style: dashed;
        }
        .caption {
          font-size: 0.92rem;
        }
      `,
    ];
  }
}

customElements.define(InstaCard.tag, InstaCard);
