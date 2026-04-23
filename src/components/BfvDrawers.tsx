const overlayHtml = `
<div class="bfv-overlay" id="bfv-pitch">
  <div class="bfv-backdrop" onclick="bfvClose('pitch')"></div>
  <div class="bfv-drawer">
    <div class="bfv-drawer-header">
      <div>
        <div class="bfv-drawer-label">Backfield Ventures</div>
        <div class="bfv-drawer-title">Pitch Us</div>
      </div>
      <button class="bfv-close" onclick="bfvClose('pitch')">✕</button>
    </div>
    <div class="bfv-progress">
      <div class="bfv-progress-track"><div class="bfv-progress-fill pitch" id="bfv-pp" style="width:25%"></div></div>
      <div class="bfv-progress-labels">
        <span class="bfv-step-lbl active" id="bfv-pl1">Company</span>
        <span class="bfv-step-lbl" id="bfv-pl2">Team</span>
        <span class="bfv-step-lbl" id="bfv-pl3">Opportunity</span>
        <span class="bfv-step-lbl" id="bfv-pl4">Submit</span>
      </div>
    </div>
    <div class="bfv-body" id="bfv-pbody">
      <div class="bfv-step active" id="bfv-ps1">
        <div><div class="bfv-step-title">Your Company</div><div class="bfv-step-desc">Tell us the basics about what you're building.</div></div>
        <hr class="bfv-divider" />
        <div class="bfv-field" id="bfv-pf-co"><label>Company Name *</label><input id="bfv-p-co" type="text" placeholder="Acme Inc." /><span class="bfv-field-error">Required</span></div>
        <div class="bfv-field"><label>Website</label><input id="bfv-p-web" type="text" placeholder="https://acme.com" /></div>
        <div class="bfv-field-row">
          <div class="bfv-field" id="bfv-pf-st"><label>Stage *</label><select id="bfv-p-st"><option value="">Select stage</option><option>Pre-Seed</option><option>Seed</option><option>Series A</option><option>Series B</option><option>Other</option></select><span class="bfv-field-error">Required</span></div>
          <div class="bfv-field"><label>Sector</label><select id="bfv-p-sec"><option value="">Select sector</option><option>B2B SaaS</option><option>Consumer</option><option>Fintech</option><option>Health &amp; Bio</option><option>Deep Tech</option><option>Climate</option><option>Marketplace</option><option>Other</option></select></div>
        </div>
        <div class="bfv-field" id="bfv-pf-ol"><label>One-Liner *</label><input id="bfv-p-ol" type="text" placeholder="We are the X for Y" /><div class="bfv-field-hint">Describe your company in one sentence.</div><span class="bfv-field-error">Required</span></div>
        <div class="bfv-field"><label>Location</label><input id="bfv-p-loc" type="text" placeholder="San Francisco, CA" /></div>
      </div>

      <div class="bfv-step" id="bfv-ps2">
        <div><div class="bfv-step-title">The Team</div><div class="bfv-step-desc">We invest in people first. Tell us about the founders.</div></div>
        <hr class="bfv-divider" />
        <div class="bfv-field" id="bfv-pf-fn"><label>Your Name *</label><input id="bfv-p-fn" type="text" placeholder="Jane Smith" /><span class="bfv-field-error">Required</span></div>
        <div class="bfv-field-row">
          <div class="bfv-field" id="bfv-pf-fr"><label>Your Role *</label><input id="bfv-p-fr" type="text" placeholder="CEO / Co-founder" /><span class="bfv-field-error">Required</span></div>
          <div class="bfv-field" id="bfv-pf-fe"><label>Email *</label><input id="bfv-p-fe" type="email" placeholder="jane@acme.com" /><span class="bfv-field-error">Required</span></div>
        </div>
        <div class="bfv-field"><label>LinkedIn</label><input id="bfv-p-li" type="text" placeholder="linkedin.com/in/janesmith" /></div>
        <div class="bfv-field"><label>Team Size</label><select id="bfv-p-ts"><option value="">Select size</option><option>Solo founder</option><option>2 founders</option><option>3–5</option><option>6–10</option><option>10+</option></select></div>
        <div class="bfv-field"><label>Relevant Background</label><textarea id="bfv-p-bg" placeholder="Prior experience, domain expertise, or notable credentials…"></textarea></div>
      </div>

      <div class="bfv-step" id="bfv-ps3">
        <div><div class="bfv-step-title">The Opportunity</div><div class="bfv-step-desc">Help us understand the problem and where you stand.</div></div>
        <hr class="bfv-divider" />
        <div class="bfv-field" id="bfv-pf-pr"><label>The Problem *</label><textarea id="bfv-p-pr" placeholder="What problem are you solving? Who feels it and how acutely?"></textarea><span class="bfv-field-error">Required</span></div>
        <div class="bfv-field"><label>Your Solution</label><textarea id="bfv-p-sol" placeholder="How does your product solve this?"></textarea></div>
        <div class="bfv-field"><label>Traction</label><textarea id="bfv-p-tr" placeholder="Revenue, users, growth rate, key partnerships…" style="min-height:70px;"></textarea></div>
        <div class="bfv-field-row">
          <div class="bfv-field"><label>Raise Amount</label><input id="bfv-p-ra" type="text" placeholder="$1.5M" /></div>
          <div class="bfv-field"><label>Raised to Date</label><input id="bfv-p-rtd" type="text" placeholder="$250K" /></div>
        </div>
      </div>

      <div class="bfv-step" id="bfv-ps4">
        <div><div class="bfv-step-title">Final Details</div><div class="bfv-step-desc">Drop your deck and any final context.</div></div>
        <hr class="bfv-divider" />
        <div class="bfv-field"><label>Pitch Deck Link</label><input id="bfv-p-deck" type="text" placeholder="https://docsend.com/…" /><div class="bfv-field-hint">DocSend, Google Drive, Notion — any shareable link.</div></div>
        <div class="bfv-field"><label>How did you hear about us?</label><select id="bfv-p-src"><option value="">Select one</option><option>Referral / Intro</option><option>Portfolio</option><option>Social media</option><option>Event / Conference</option><option>Cold outreach</option><option>Other</option></select></div>
        <div class="bfv-field"><label>Anything else?</label><textarea id="bfv-p-notes" placeholder="Any context that doesn't fit above…" style="min-height:80px;"></textarea></div>
        <div class="bfv-field"><label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;"><input type="checkbox" id="bfv-p-agree" style="width:auto;flex-shrink:0;margin-top:2px;" /><span style="font-family:'IBM Plex Sans',sans-serif;font-size:12px;color:rgba(240,237,232,0.5);line-height:1.5;">I understand that submission does not guarantee a response, and that Backfield Ventures may share this information internally for evaluation.</span></label></div>
      </div>

      <div class="bfv-confirm" id="bfv-pconf" style="display:none;">
        <div class="bfv-confirm-icon">✓</div>
        <div class="bfv-confirm-title">Pitch Received</div>
        <p class="bfv-confirm-body">Thank you for reaching out. We review every submission and will be in touch if there's a fit — typically within 2–3 weeks.</p>
        <div class="bfv-confirm-detail">Backfield Ventures · <span id="bfv-pconf-email"></span></div>
        <button class="bfv-btn-sm" onclick="bfvClose('pitch')" style="margin-top:8px;">Close ✕</button>
      </div>
    </div>
    <div class="bfv-footer" id="bfv-pfooter">
      <div class="bfv-counter" id="bfv-pctr">01 / 04</div>
      <div class="bfv-footer-btns">
        <button class="bfv-btn-sm" id="bfv-pback" onclick="bfvPitchNav(-1)" style="display:none;">← Back</button>
        <button class="bfv-btn-sm filled" id="bfv-pnext" onclick="bfvPitchNav(1)">Next →</button>
      </div>
    </div>
  </div>
</div>

<div class="bfv-overlay" id="bfv-invest">
  <div class="bfv-backdrop" onclick="bfvClose('invest')"></div>
  <div class="bfv-drawer">
    <div class="bfv-drawer-header">
      <div>
        <div class="bfv-drawer-label">Backfield Ventures</div>
        <div class="bfv-drawer-title">Invest with Us</div>
      </div>
      <button class="bfv-close" onclick="bfvClose('invest')">✕</button>
    </div>
    <div class="bfv-progress">
      <div class="bfv-progress-track"><div class="bfv-progress-fill invest" id="bfv-ip" style="width:25%"></div></div>
      <div class="bfv-progress-labels">
        <span class="bfv-step-lbl invest-active" id="bfv-il1">Profile</span>
        <span class="bfv-step-lbl" id="bfv-il2">Status</span>
        <span class="bfv-step-lbl" id="bfv-il3">Interest</span>
        <span class="bfv-step-lbl" id="bfv-il4">Submit</span>
      </div>
    </div>
    <div class="bfv-body" id="bfv-ibody">
      <div class="bfv-step active" id="bfv-is1">
        <div><div class="bfv-step-title">About You</div><div class="bfv-step-desc">We'd love to learn who you are before we connect.</div></div>
        <hr class="bfv-divider" />
        <div class="bfv-field-row">
          <div class="bfv-field" id="bfv-if-fn"><label>First Name *</label><input id="bfv-i-fn" type="text" placeholder="Jane" /><span class="bfv-field-error">Required</span></div>
          <div class="bfv-field" id="bfv-if-ln"><label>Last Name *</label><input id="bfv-i-ln" type="text" placeholder="Smith" /><span class="bfv-field-error">Required</span></div>
        </div>
        <div class="bfv-field" id="bfv-if-em"><label>Email *</label><input id="bfv-i-em" type="email" placeholder="jane@example.com" /><span class="bfv-field-error">Required</span></div>
        <div class="bfv-field"><label>Phone</label><input id="bfv-i-ph" type="tel" placeholder="+1 (555) 000-0000" /></div>
        <div class="bfv-field-row">
          <div class="bfv-field"><label>Location</label><input id="bfv-i-loc" type="text" placeholder="New York, NY" /></div>
          <div class="bfv-field"><label>Organization / Firm</label><input id="bfv-i-org" type="text" placeholder="Smith Family Office" /></div>
        </div>
        <div class="bfv-field"><label>Role / Title</label><input id="bfv-i-role" type="text" placeholder="Managing Partner" /></div>
      </div>

      <div class="bfv-step" id="bfv-is2">
        <div><div class="bfv-step-title">Investor Status</div><div class="bfv-step-desc">A few questions to understand your background.</div></div>
        <hr class="bfv-divider" />
        <div class="bfv-field"><label>Accredited Investor Status *</label>
          <div class="bfv-radio-group" id="bfv-i-acc">
            <div class="bfv-radio-opt" onclick="bfvRadio('bfv-i-acc',this)"><div class="bfv-radio-dot"></div><div class="bfv-opt-text">Yes — Accredited Investor (US)</div></div>
            <div class="bfv-radio-opt" onclick="bfvRadio('bfv-i-acc',this)"><div class="bfv-radio-dot"></div><div class="bfv-opt-text">Yes — Qualified Purchaser / Institutional</div></div>
            <div class="bfv-radio-opt" onclick="bfvRadio('bfv-i-acc',this)"><div class="bfv-radio-dot"></div><div class="bfv-opt-text">Non-US investor (equivalent status)</div></div>
            <div class="bfv-radio-opt" onclick="bfvRadio('bfv-i-acc',this)"><div class="bfv-radio-dot"></div><div class="bfv-opt-text">Not sure / prefer not to say</div></div>
          </div>
        </div>
        <div class="bfv-field"><label>Investor Type</label>
          <div class="bfv-radio-group" id="bfv-i-type">
            <div class="bfv-radio-opt" onclick="bfvRadio('bfv-i-type',this)"><div class="bfv-radio-dot"></div><div class="bfv-opt-text">Individual / Angel</div></div>
            <div class="bfv-radio-opt" onclick="bfvRadio('bfv-i-type',this)"><div class="bfv-radio-dot"></div><div class="bfv-opt-text">Family Office</div></div>
            <div class="bfv-radio-opt" onclick="bfvRadio('bfv-i-type',this)"><div class="bfv-radio-dot"></div><div class="bfv-opt-text">Institutional / Fund of Funds</div></div>
            <div class="bfv-radio-opt" onclick="bfvRadio('bfv-i-type',this)"><div class="bfv-radio-dot"></div><div class="bfv-opt-text">Endowment / Foundation</div></div>
            <div class="bfv-radio-opt" onclick="bfvRadio('bfv-i-type',this)"><div class="bfv-radio-dot"></div><div class="bfv-opt-text">Corporate / Strategic</div></div>
          </div>
        </div>
        <div class="bfv-field"><label>Prior VC / Alternatives Exposure</label>
          <select id="bfv-i-exp"><option value="">Select one</option><option>No prior experience</option><option>1–2 investments</option><option>Active angel (3–10)</option><option>Experienced LP (multiple funds)</option><option>GP / Professional investor</option></select>
        </div>
      </div>

      <div class="bfv-step" id="bfv-is3">
        <div><div class="bfv-step-title">Your Interest</div><div class="bfv-step-desc">Help us understand what you're looking for.</div></div>
        <hr class="bfv-divider" />
        <div class="bfv-field"><label>Interest Level</label>
          <div class="bfv-radio-group" id="bfv-i-int">
            <div class="bfv-radio-opt" onclick="bfvRadio('bfv-i-int',this)"><div class="bfv-radio-dot"></div><div class="bfv-opt-text">LP in Backfield fund</div></div>
            <div class="bfv-radio-opt" onclick="bfvRadio('bfv-i-int',this)"><div class="bfv-radio-dot"></div><div class="bfv-opt-text">Co-invest in specific deals</div></div>
            <div class="bfv-radio-opt" onclick="bfvRadio('bfv-i-int',this)"><div class="bfv-radio-dot"></div><div class="bfv-opt-text">Both / explore all options</div></div>
            <div class="bfv-radio-opt" onclick="bfvRadio('bfv-i-int',this)"><div class="bfv-radio-dot"></div><div class="bfv-opt-text">Still exploring, want to learn more</div></div>
          </div>
        </div>
        <div class="bfv-field"><label>Target Check Size</label>
          <select id="bfv-i-chk"><option value="">Select range</option><option>Under $100K</option><option>$100K – $250K</option><option>$250K – $500K</option><option>$500K – $1M</option><option>$1M – $5M</option><option>$5M+</option></select>
        </div>
        <div class="bfv-field"><label>Sectors of Interest</label>
          <div class="bfv-check-group">
            <div class="bfv-check-opt" onclick="this.classList.toggle('sel')"><div class="bfv-check-box">✓</div><div class="bfv-opt-text">CPG (Consumer Packaged Goods)</div></div>
            <div class="bfv-check-opt" onclick="this.classList.toggle('sel')"><div class="bfv-check-box">✓</div><div class="bfv-opt-text">Sports</div></div>
            <div class="bfv-check-opt" onclick="this.classList.toggle('sel')"><div class="bfv-check-box">✓</div><div class="bfv-opt-text">Other</div></div>
          </div>
        </div>
        <div class="bfv-field"><label>Investment Timeline</label>
          <select id="bfv-i-tl"><option value="">Select one</option><option>Actively deploying now</option><option>Within 6 months</option><option>6–12 months</option><option>Just exploring</option></select>
        </div>
      </div>

      <div class="bfv-step" id="bfv-is4">
        <div><div class="bfv-step-title">Connect</div><div class="bfv-step-desc">Last step. Tell us how you found us.</div></div>
        <hr class="bfv-divider" />
        <div class="bfv-field"><label>How did you hear about us?</label><select id="bfv-i-src"><option value="">Select one</option><option>Referral / Introduction</option><option>Portfolio founder</option><option>Social media / LinkedIn</option><option>Event / Conference</option><option>Press / Media</option><option>Other</option></select></div>
        <div class="bfv-field"><label>Referral Name</label><input id="bfv-i-ref" type="text" placeholder="Who introduced us?" /><div class="bfv-field-hint">Only if applicable.</div></div>
        <div class="bfv-field"><label>Anything else?</label><textarea id="bfv-i-notes" placeholder="Your goals, questions, or context that would help us prepare…"></textarea></div>
        <div class="bfv-field"><label>Preferred Contact Method</label>
          <div class="bfv-radio-group" id="bfv-i-ctct">
            <div class="bfv-radio-opt" onclick="bfvRadio('bfv-i-ctct',this)"><div class="bfv-radio-dot"></div><div class="bfv-opt-text">Email</div></div>
            <div class="bfv-radio-opt" onclick="bfvRadio('bfv-i-ctct',this)"><div class="bfv-radio-dot"></div><div class="bfv-opt-text">Phone / Video call</div></div>
            <div class="bfv-radio-opt" onclick="bfvRadio('bfv-i-ctct',this)"><div class="bfv-radio-dot"></div><div class="bfv-opt-text">No preference</div></div>
          </div>
        </div>
        <div class="bfv-field"><label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;"><input type="checkbox" id="bfv-i-agree" style="width:auto;flex-shrink:0;margin-top:2px;" /><span style="font-family:'IBM Plex Sans',sans-serif;font-size:12px;color:rgba(240,237,232,0.5);line-height:1.5;">I understand this is an expression of interest only and does not constitute a binding commitment.</span></label></div>
      </div>

      <div class="bfv-confirm" id="bfv-iconf" style="display:none;">
        <div class="bfv-confirm-icon invest">✓</div>
        <div class="bfv-confirm-title">Interest Noted</div>
        <p class="bfv-confirm-body">We'll review your information and reach out to schedule an introductory call. Grateful for your interest in partnering with Backfield.</p>
        <div class="bfv-confirm-detail">Backfield Ventures · <span id="bfv-iconf-email"></span></div>
        <button class="bfv-btn-sm" onclick="bfvClose('invest')" style="margin-top:8px;">Close ✕</button>
      </div>
    </div>
    <div class="bfv-footer" id="bfv-ifooter">
      <div class="bfv-counter" id="bfv-ictr">01 / 04</div>
      <div class="bfv-footer-btns">
        <button class="bfv-btn-sm" id="bfv-iback" onclick="bfvInvestNav(-1)" style="display:none;">← Back</button>
        <button class="bfv-btn-sm filled" id="bfv-inext" onclick="bfvInvestNav(1)">Next →</button>
      </div>
    </div>
  </div>
</div>

<div class="bfvp-overlay" id="bfvp-overlay">
  <div class="bfvp-backdrop" onclick="bfvPartnerClose()"></div>
  <div class="bfvp-drawer">
    <div class="bfvp-header">
      <div>
        <div class="bfvp-label">Backfield Ventures</div>
        <div class="bfvp-title">Partner with Us</div>
      </div>
      <button class="bfvp-close" onclick="bfvPartnerClose()">&#x2715;</button>
    </div>

    <div class="bfvp-progress">
      <div class="bfvp-track"><div class="bfvp-fill" id="bfvp-fill" style="width:25%"></div></div>
      <div class="bfvp-prog-labels">
        <span class="bfvp-lbl cur" id="bfvp-l1">Background</span>
        <span class="bfvp-lbl" id="bfvp-l2">Experience</span>
        <span class="bfvp-lbl" id="bfvp-l3">Engagement</span>
        <span class="bfvp-lbl" id="bfvp-l4">Submit</span>
      </div>
    </div>

    <div class="bfvp-body" id="bfvp-body">

      <!-- Step 1 -->
      <div class="bfvp-step active" id="bfvp-s1">
        <div><div class="bfvp-step-title">Your Background</div><div class="bfvp-step-desc">Tell us who you are and what you&apos;ve built.</div></div>
        <hr class="bfvp-divider" />
        <div class="bfvp-row">
          <div class="bfvp-field" id="bfvp-f-fn"><label>First Name *</label><input id="bfvp-fn" type="text" placeholder="Alex" /><span class="bfvp-field-err">Required</span></div>
          <div class="bfvp-field" id="bfvp-f-ln"><label>Last Name *</label><input id="bfvp-ln" type="text" placeholder="Johnson" /><span class="bfvp-field-err">Required</span></div>
        </div>
        <div class="bfvp-field" id="bfvp-f-em"><label>Email *</label><input id="bfvp-em" type="email" placeholder="alex@example.com" /><span class="bfvp-field-err">Required</span></div>
        <div class="bfvp-field"><label>LinkedIn</label><input id="bfvp-li" type="text" placeholder="linkedin.com/in/alexjohnson" /></div>
        <div class="bfvp-row">
          <div class="bfvp-field"><label>Current Title</label><input id="bfvp-title" type="text" placeholder="VP of Growth" /></div>
          <div class="bfvp-field"><label>Current Company</label><input id="bfvp-co" type="text" placeholder="Acme Corp" /></div>
        </div>
        <div class="bfvp-field"><label>Primary Sector Expertise</label>
          <select id="bfvp-sec">
            <option value="">Select sector</option>
            <option>B2B SaaS / Enterprise</option>
            <option>Consumer &amp; Commerce</option>
            <option>Fintech &amp; Financial Services</option>
            <option>Health &amp; Life Sciences</option>
            <option>Deep Tech / AI / Infrastructure</option>
            <option>Climate &amp; Sustainability</option>
            <option>Marketplace</option>
            <option>Sports</option>
            <option>Other / Cross-sector</option>
          </select>
        </div>
      </div>

      <!-- Step 2 -->
      <div class="bfvp-step" id="bfvp-s2">
        <div><div class="bfvp-step-title">Your Experience</div><div class="bfvp-step-desc">Help us understand the depth of your operator background.</div></div>
        <hr class="bfvp-divider" />
        <div class="bfvp-field" id="bfvp-f-bg"><label>Operator Background *</label>
          <textarea id="bfvp-bg" placeholder="What have you built or scaled? Prior companies, roles, key achievements..."></textarea>
          <span class="bfvp-field-err">Required</span>
        </div>
        <div class="bfvp-field"><label>Stage Experience</label>
          <div class="bfvp-check-group" id="bfvp-stage-exp">
            <div class="bfvp-copt" onclick="this.classList.toggle('sel')"><div class="bfvp-cbox">&#x2713;</div><div class="bfvp-opt-text">0 &rarr; 1 (pre-product, idea stage)</div></div>
            <div class="bfvp-copt" onclick="this.classList.toggle('sel')"><div class="bfvp-cbox">&#x2713;</div><div class="bfvp-opt-text">Early traction (pre-seed / seed)</div></div>
            <div class="bfvp-copt" onclick="this.classList.toggle('sel')"><div class="bfvp-cbox">&#x2713;</div><div class="bfvp-opt-text">Growth (Series A&ndash;C)</div></div>
            <div class="bfvp-copt" onclick="this.classList.toggle('sel')"><div class="bfvp-cbox">&#x2713;</div><div class="bfvp-opt-text">Scale / Late stage</div></div>
            <div class="bfvp-copt" onclick="this.classList.toggle('sel')"><div class="bfvp-cbox">&#x2713;</div><div class="bfvp-opt-text">Exit / M&amp;A experience</div></div>
          </div>
        </div>
        <div class="bfvp-field"><label>Functional Strengths</label>
          <div class="bfvp-check-group" id="bfvp-func-str">
            <div class="bfvp-copt" onclick="this.classList.toggle('sel')"><div class="bfvp-cbox">&#x2713;</div><div class="bfvp-opt-text">Go-to-market / Sales</div></div>
            <div class="bfvp-copt" onclick="this.classList.toggle('sel')"><div class="bfvp-cbox">&#x2713;</div><div class="bfvp-opt-text">Product / Engineering</div></div>
            <div class="bfvp-copt" onclick="this.classList.toggle('sel')"><div class="bfvp-cbox">&#x2713;</div><div class="bfvp-opt-text">Marketing / Brand</div></div>
            <div class="bfvp-copt" onclick="this.classList.toggle('sel')"><div class="bfvp-cbox">&#x2713;</div><div class="bfvp-opt-text">Finance / Operations</div></div>
            <div class="bfvp-copt" onclick="this.classList.toggle('sel')"><div class="bfvp-cbox">&#x2713;</div><div class="bfvp-opt-text">Hiring / Team building</div></div>
            <div class="bfvp-copt" onclick="this.classList.toggle('sel')"><div class="bfvp-cbox">&#x2713;</div><div class="bfvp-opt-text">Partnerships / BD</div></div>
          </div>
        </div>
        <div class="bfvp-field"><label>Prior Advisory Experience</label>
          <select id="bfvp-adv">
            <option value="">Select one</option>
            <option>No prior advisory roles</option>
            <option>1&ndash;2 informal advisor roles</option>
            <option>Active advisor (formal equity/cash)</option>
            <option>Board member / Observer</option>
            <option>EIR / Venture Partner</option>
          </select>
        </div>
      </div>

      <!-- Step 3 -->
      <div class="bfvp-step" id="bfvp-s3">
        <div><div class="bfvp-step-title">How You Want to Engage</div><div class="bfvp-step-desc">Tell us what kind of relationship you&apos;re looking for.</div></div>
        <hr class="bfvp-divider" />
        <div class="bfvp-field"><label>Primary Interest</label>
          <div class="bfvp-radio-group" id="bfvp-role">
            <div class="bfvp-ropt" onclick="bfvpRadio('bfvp-role',this)"><div class="bfvp-rdot"></div><div class="bfvp-opt-text">Advisor to portfolio companies</div></div>
            <div class="bfvp-ropt" onclick="bfvpRadio('bfvp-role',this)"><div class="bfvp-rdot"></div><div class="bfvp-opt-text">Strategic advisor to Backfield Ventures</div></div>
            <div class="bfvp-ropt" onclick="bfvpRadio('bfvp-role',this)"><div class="bfvp-rdot"></div><div class="bfvp-opt-text">Both &mdash; open to either</div></div>
            <div class="bfvp-ropt" onclick="bfvpRadio('bfvp-role',this)"><div class="bfvp-rdot"></div><div class="bfvp-opt-text">Just want to connect / stay in touch</div></div>
          </div>
        </div>
        <div class="bfvp-field"><label>Time Commitment</label>
          <div class="bfvp-radio-group" id="bfvp-time">
            <div class="bfvp-ropt" onclick="bfvpRadio('bfvp-time',this)"><div class="bfvp-rdot"></div><div class="bfvp-opt-text">Light touch &mdash; 1&ndash;2 hrs/month</div></div>
            <div class="bfvp-ropt" onclick="bfvpRadio('bfvp-time',this)"><div class="bfvp-rdot"></div><div class="bfvp-opt-text">Active &mdash; a few hrs/week</div></div>
            <div class="bfvp-ropt" onclick="bfvpRadio('bfvp-time',this)"><div class="bfvp-rdot"></div><div class="bfvp-opt-text">Embedded / Fractional exec role</div></div>
            <div class="bfvp-ropt" onclick="bfvpRadio('bfvp-time',this)"><div class="bfvp-rdot"></div><div class="bfvp-opt-text">Flexible &mdash; depends on fit</div></div>
          </div>
        </div>
        <div class="bfvp-field"><label>Compensation Preference</label>
          <div class="bfvp-radio-group" id="bfvp-comp">
            <div class="bfvp-ropt" onclick="bfvpRadio('bfvp-comp',this)"><div class="bfvp-rdot"></div><div class="bfvp-opt-text">Equity only</div></div>
            <div class="bfvp-ropt" onclick="bfvpRadio('bfvp-comp',this)"><div class="bfvp-rdot"></div><div class="bfvp-opt-text">Cash + equity</div></div>
            <div class="bfvp-ropt" onclick="bfvpRadio('bfvp-comp',this)"><div class="bfvp-rdot"></div><div class="bfvp-opt-text">Pro bono / giving back</div></div>
            <div class="bfvp-ropt" onclick="bfvpRadio('bfvp-comp',this)"><div class="bfvp-rdot"></div><div class="bfvp-opt-text">Open to discussion</div></div>
          </div>
        </div>
      </div>

      <!-- Step 4 -->
      <div class="bfvp-step" id="bfvp-s4">
        <div><div class="bfvp-step-title">Let&apos;s Connect</div><div class="bfvp-step-desc">Final details before we reach out.</div></div>
        <hr class="bfvp-divider" />
        <div class="bfvp-field"><label>How did you hear about us?</label>
          <select id="bfvp-src"><option value="">Select one</option><option>Referral / Introduction</option><option>Portfolio founder</option><option>Social media / LinkedIn</option><option>Event / Conference</option><option>Press / Media</option><option>Other</option></select>
        </div>
        <div class="bfvp-field"><label>Referral Name</label><input id="bfvp-ref" type="text" placeholder="Who introduced us?" /><div class="bfvp-field-hint">Only if applicable.</div></div>
        <div class="bfvp-field"><label>Why Backfield?</label>
          <textarea id="bfvp-why" placeholder="What draws you to working with us specifically?"></textarea>
        </div>
        <div class="bfvp-field"><label>Anything else?</label>
          <textarea id="bfvp-notes" placeholder="Specific companies, constraints, questions..." style="min-height:70px;"></textarea>
        </div>
        <div class="bfvp-field">
          <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;">
            <input type="checkbox" id="bfvp-agree" style="width:auto;flex-shrink:0;margin-top:2px;" />
            <span style="font-family:'IBM Plex Sans',sans-serif;font-size:12px;color:rgba(240,237,232,0.5);line-height:1.5;">I understand this is an expression of interest and Backfield Ventures will reach out if there is a mutual fit.</span>
          </label>
        </div>
      </div>

      <!-- Confirm -->
      <div class="bfvp-confirm" id="bfvp-confirm" style="display:none;">
        <div class="bfvp-confirm-icon">&#x2713;</div>
        <div class="bfvp-confirm-title">Thanks for Reaching Out</div>
        <p class="bfvp-confirm-body">We&apos;ll review your background and be in touch if there&apos;s a fit with our portfolio or fund. We appreciate operators who want to give back.</p>
        <div class="bfvp-confirm-detail">Backfield Ventures &middot; <span id="bfvp-conf-email"></span></div>
        <button class="bfvp-btn" onclick="bfvPartnerClose()" style="margin-top:8px;">Close &#x2715;</button>
      </div>

    </div>

    <div class="bfvp-footer" id="bfvp-footer">
      <div class="bfvp-counter" id="bfvp-ctr">01 / 04</div>
      <div class="bfvp-footer-btns">
        <button class="bfvp-btn" id="bfvp-back" onclick="bfvpNav(-1)" style="display:none;">&larr; Back</button>
        <button class="bfvp-btn filled" id="bfvp-next" onclick="bfvpNav(1)">Next &rarr;</button>
      </div>
    </div>
  </div>
</div>
`;

export default function BfvDrawers() {
  return <div dangerouslySetInnerHTML={{ __html: overlayHtml }} />;
}
