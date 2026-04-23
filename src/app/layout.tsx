import type { Metadata } from "next";
import { Bebas_Neue, Space_Mono } from "next/font/google";
import "./globals.css";
import BfvDrawers from "@/components/BfvDrawers";

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-bebas-neue",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Backfield Ventures | Sports & CPG Venture Capital | Austin, TX",
  description:
    "Backfield Ventures is an Austin, TX venture capital firm backing the next generation of sports, CPG, and consumer companies. Pre-Seed to Series A. Founder, investor, or operator — let's talk.",
  applicationName: "Backfield Ventures",
  metadataBase: new URL("https://backfieldventures.com"),
  alternates: {
    canonical: "https://backfieldventures.com",
  },
  keywords: [
    // Core identity
    "Backfield Ventures",
    "venture capital Austin Texas",
    "Austin VC firm",
    "Austin venture capital",
    "Texas venture capital",
    // Sports investing
    "sports venture capital",
    "sports investing",
    "sports VC",
    "invest in sports companies",
    "sports startup funding",
    "sports technology investment",
    "fan engagement investment",
    "athlete brands venture capital",
    "sports media investment",
    "sports data analytics investment",
    // CPG
    "CPG venture capital",
    "CPG investing",
    "consumer packaged goods startup funding",
    "CPG startup investor",
    "CPG brand investment",
    "emerging CPG brands",
    // Consumer
    "consumer brands venture capital",
    "DTC venture capital",
    "direct to consumer startup funding",
    "consumer health wellness investment",
    "lifestyle brand investment",
    "commerce marketplace funding",
    // Stage
    "pre-seed venture capital",
    "seed funding",
    "Series A venture capital",
    "early stage startup funding",
    "seed stage investor",
    // General VC
    "venture capital fund",
    "startup investor",
    "angel investor Austin",
    "VC for consumer startups",
    "how to get venture capital funding",
  ],
  openGraph: {
    title: "Backfield Ventures | Sports & CPG Venture Capital | Austin, TX",
    description:
      "Backfield Ventures is an Austin, TX venture capital firm backing the next generation of sports, CPG, and consumer companies. Pre-Seed to Series A. Founder, investor, or operator — let's talk.",
    url: "https://backfieldventures.com",
    siteName: "Backfield Ventures",
    type: "website",
    locale: "en_US",
    // og:image is auto-generated from src/app/opengraph-image.png
  },
  twitter: {
    card: "summary_large_image",
    title: "Backfield Ventures | Sports & CPG Venture Capital | Austin, TX",
    description:
      "Backfield Ventures is an Austin, TX venture capital firm backing the next generation of sports, CPG, and consumer companies. Pre-Seed to Series A. Founder, investor, or operator — let's talk.",
    // twitter:image falls back to og:image
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  icons: {
    shortcut: "/favicon.ico",
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    other: [{ rel: "manifest", url: "/site.webmanifest" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "FinancialService"],
      "@id": "https://backfieldventures.com/#organization",
      name: "Backfield Ventures",
      url: "https://backfieldventures.com",
      logo: "https://backfieldventures.com/logo-text.png",
      image: "https://backfieldventures.com/opengraph-image.png",
      description:
        "Backfield Ventures is an Austin, Texas venture capital firm investing in sports, CPG, and consumer brands from pre-seed through Series A.",
      email: "hello@backfieldventures.com",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Austin",
        addressRegion: "TX",
        addressCountry: "US",
      },
      areaServed: ["United States"],
      knowsAbout: [
        "Venture Capital",
        "Sports Investing",
        "Consumer Packaged Goods",
        "CPG Brands",
        "Consumer Brands",
        "DTC Startups",
        "Sports Technology",
        "Fan Engagement",
        "Athlete Brands",
        "Seed Funding",
        "Series A Funding",
        "Austin Texas Startups",
      ],
      sameAs: ["https://www.linkedin.com/company/backfield-ventures"],
    },
    {
      "@type": "WebSite",
      "@id": "https://backfieldventures.com/#website",
      url: "https://backfieldventures.com",
      name: "Backfield Ventures",
      publisher: { "@id": "https://backfieldventures.com/#organization" },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What does Backfield Ventures invest in?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Backfield Ventures invests in sports, CPG, and consumer brands. Our consumer focus includes DTC brands, CPG companies, consumer health & wellness, community-driven platforms, modern lifestyle brands, and commerce & marketplaces. Our sports focus includes fan engagement & experiences, athlete brands & ventures, sports technology, media & streaming, and sports data & analytics.",
          },
        },
        {
          "@type": "Question",
          name: "Is Backfield Ventures based in Austin, Texas?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Backfield Ventures is headquartered in Austin, Texas and invests in sports, CPG, and consumer companies across the United States.",
          },
        },
        {
          "@type": "Question",
          name: "How do I get funding from Backfield Ventures?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Reach out directly at hello@backfieldventures.com with the subject 'Founder Intro'. We read every deck and respond to every serious inquiry.",
          },
        },
        {
          "@type": "Question",
          name: "What stage does Backfield Ventures invest at?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Our primary focus is Seed and Series A. We invest selectively at Pre-Seed when the opportunity is compelling, and occasionally at Series B+ when we have meaningful insight into the business.",
          },
        },
        {
          "@type": "Question",
          name: "Does Backfield Ventures invest in CPG companies?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Backfield Ventures actively invests in CPG (consumer packaged goods) brands and DTC companies, particularly those with strong brand identity, community, and omnichannel growth potential.",
          },
        },
        {
          "@type": "Question",
          name: "How can investors or LPs learn about Backfield Ventures?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "We're selective about LP relationships. Reach out at hello@backfieldventures.com with the subject 'LP Inquiry' to learn more about our focus and portfolio.",
          },
        },
        {
          "@type": "Question",
          name: "How can operators or partners work with Backfield Ventures?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "If you work in consumer or sports and want to explore collaboration — for portfolio companies or in a broader capacity — reach out at hello@backfieldventures.com with the subject 'Partnership'.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${spaceMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=switzer@300,400,500,700&display=swap"
          rel="stylesheet"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=IBM+Plex+Sans:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="grain">
        {children}
        <BfvDrawers />
        <script dangerouslySetInnerHTML={{ __html: `(function(){
  var ps = 1, is = 1, T = 4;

  window.bfvOpen = function(t) {
    document.getElementById('bfv-'+t).classList.add('bfv-open');
    document.body.style.overflow = 'hidden';
  };
  window.bfvClose = function(t) {
    document.getElementById('bfv-'+t).classList.remove('bfv-open');
    document.body.style.overflow = '';
  };
  window.bfvRadio = function(gid, el) {
    document.querySelectorAll('#'+gid+' .bfv-radio-opt').forEach(function(o){ o.classList.remove('sel'); });
    el.classList.add('sel');
  };

  function bfvGetRadio(gid) {
    var sel = document.querySelector('#'+gid+' .bfv-radio-opt.sel .bfv-opt-text');
    return sel ? sel.textContent.trim() : '';
  }
  function bfvGetChecks(gid) {
    var sels = document.querySelectorAll('#'+gid+' .bfv-check-opt.sel .bfv-opt-text');
    return Array.from(sels).map(function(el){ return el.textContent.trim(); }).join(', ');
  }

  function bfvProgress(type, step) {
    var pct = (step/T)*100;
    document.getElementById('bfv-'+(type==='pitch'?'p':'i')+'p').style.width = pct+'%';
    var pfx = type==='pitch' ? 'bfv-pl' : 'bfv-il';
    var activeClass = type==='pitch' ? 'active' : 'invest-active';
    for(var i=1;i<=T;i++){
      var l=document.getElementById(pfx+i);
      l.classList.remove('active','invest-active','done');
      if(i<step) l.classList.add('done');
      if(i===step) l.classList.add(activeClass);
    }
    document.getElementById('bfv-'+(type==='pitch'?'p':'i')+'ctr').textContent =
      String(step).padStart(2,'0')+' / '+String(T).padStart(2,'0');
    document.getElementById('bfv-'+(type==='pitch'?'p':'i')+'back').style.display = step>1?'inline-flex':'none';
    document.getElementById('bfv-'+(type==='pitch'?'p':'i')+'next').textContent = step===T?'Submit →':'Next →';
  }

  function bfvShow(type, step) {
    var pfx = 'bfv-'+(type==='pitch'?'p':'i')+'s';
    for(var i=1;i<=T;i++){
      var el=document.getElementById(pfx+i);
      if(el) el.classList.remove('active');
    }
    var t=document.getElementById(pfx+step);
    if(t) t.classList.add('active');
  }

  function bfvVal(id, fid) {
    var inp=document.getElementById(id), f=document.getElementById(fid);
    if(!inp||!inp.value.trim()){if(f)f.classList.add('bfv-err');return false;}
    if(f)f.classList.remove('bfv-err'); return true;
  }
  function bfvValEmail(id, fid) {
    var inp=document.getElementById(id), f=document.getElementById(fid);
    if(!inp||!inp.value.trim()||!inp.value.includes('@')){
      if(f){f.classList.add('bfv-err');var e=f.querySelector('.bfv-field-error');if(e)e.textContent=inp&&inp.value?'Valid email required':'Required';}
      return false;
    }
    if(f)f.classList.remove('bfv-err'); return true;
  }
  function bfvValSel(id, fid) {
    var sel=document.getElementById(id), f=document.getElementById(fid);
    if(!sel||!sel.value){if(f)f.classList.add('bfv-err');return false;}
    if(f)f.classList.remove('bfv-err'); return true;
  }

  function bfvPitchConfirm() {
    var email=document.getElementById('bfv-p-fe').value;
    document.getElementById('bfv-pconf-email').textContent=email;
    for(var i=1;i<=T;i++){var el=document.getElementById('bfv-ps'+i);if(el)el.classList.remove('active');}
    document.getElementById('bfv-pconf').style.display='flex';
    document.getElementById('bfv-pfooter').style.display='none';
    document.getElementById('bfv-pp').style.width='100%';
    for(var j=1;j<=T;j++){var l=document.getElementById('bfv-pl'+j);l.classList.remove('active');l.classList.add('done');}
  }

  function bfvInvestConfirm() {
    var email=document.getElementById('bfv-i-em').value;
    document.getElementById('bfv-iconf-email').textContent=email;
    for(var i=1;i<=T;i++){var el=document.getElementById('bfv-is'+i);if(el)el.classList.remove('active');}
    document.getElementById('bfv-iconf').style.display='flex';
    document.getElementById('bfv-ifooter').style.display='none';
    document.getElementById('bfv-ip').style.width='100%';
    for(var j=1;j<=T;j++){var l=document.getElementById('bfv-il'+j);l.classList.remove('active','invest-active');l.classList.add('done');}
  }

  window.bfvPitchNav = function(d) {
    if(d===1){
      if(ps===1){var ok=bfvVal('bfv-p-co','bfv-pf-co')&bfvValSel('bfv-p-st','bfv-pf-st')&bfvVal('bfv-p-ol','bfv-pf-ol');if(!ok)return;}
      if(ps===2){var ok2=bfvVal('bfv-p-fn','bfv-pf-fn')&bfvVal('bfv-p-fr','bfv-pf-fr')&bfvValEmail('bfv-p-fe','bfv-pf-fe');if(!ok2)return;}
      if(ps===3){if(!bfvVal('bfv-p-pr','bfv-pf-pr'))return;}
      if(ps===T){
        var nextBtn=document.getElementById('bfv-pnext');
        nextBtn.textContent='Submitting…';
        nextBtn.disabled=true;
        var payload={
          company: document.getElementById('bfv-p-co').value,
          website: document.getElementById('bfv-p-web').value,
          stage: document.getElementById('bfv-p-st').value,
          sector: document.getElementById('bfv-p-sec').value,
          oneLiner: document.getElementById('bfv-p-ol').value,
          location: document.getElementById('bfv-p-loc').value,
          founderName: document.getElementById('bfv-p-fn').value,
          founderRole: document.getElementById('bfv-p-fr').value,
          founderEmail: document.getElementById('bfv-p-fe').value,
          linkedin: document.getElementById('bfv-p-li').value,
          teamSize: document.getElementById('bfv-p-ts').value,
          background: document.getElementById('bfv-p-bg').value,
          problem: document.getElementById('bfv-p-pr').value,
          solution: document.getElementById('bfv-p-sol').value,
          traction: document.getElementById('bfv-p-tr').value,
          raiseAmount: document.getElementById('bfv-p-ra').value,
          raisedToDate: document.getElementById('bfv-p-rtd').value,
          deckLink: document.getElementById('bfv-p-deck').value,
          source: document.getElementById('bfv-p-src').value,
          notes: document.getElementById('bfv-p-notes').value,
        };
        fetch('/api/pitch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
          .then(function(){bfvPitchConfirm();})
          .catch(function(){bfvPitchConfirm();});
        return;
      }
    }
    ps=Math.max(1,Math.min(T,ps+d));
    bfvShow('pitch',ps); bfvProgress('pitch',ps);
    document.getElementById('bfv-pbody').scrollTop=0;
  };

  window.bfvInvestNav = function(d) {
    if(d===1){
      if(is===1){var ok=bfvVal('bfv-i-fn','bfv-if-fn')&bfvVal('bfv-i-ln','bfv-if-ln')&bfvValEmail('bfv-i-em','bfv-if-em');if(!ok)return;}
      if(is===T){
        var nextBtn=document.getElementById('bfv-inext');
        nextBtn.textContent='Submitting…';
        nextBtn.disabled=true;
        var payload={
          firstName: document.getElementById('bfv-i-fn').value,
          lastName: document.getElementById('bfv-i-ln').value,
          email: document.getElementById('bfv-i-em').value,
          phone: document.getElementById('bfv-i-ph').value,
          location: document.getElementById('bfv-i-loc').value,
          organization: document.getElementById('bfv-i-org').value,
          role: document.getElementById('bfv-i-role').value,
          accreditedStatus: bfvGetRadio('bfv-i-acc'),
          investorType: bfvGetRadio('bfv-i-type'),
          experience: document.getElementById('bfv-i-exp').value,
          interestLevel: bfvGetRadio('bfv-i-int'),
          checkSize: document.getElementById('bfv-i-chk').value,
          sectors: bfvGetChecks('bfv-ibody'),
          timeline: document.getElementById('bfv-i-tl').value,
          source: document.getElementById('bfv-i-src').value,
          referral: document.getElementById('bfv-i-ref').value,
          notes: document.getElementById('bfv-i-notes').value,
          preferredContact: bfvGetRadio('bfv-i-ctct'),
        };
        fetch('/api/invest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
          .then(function(){bfvInvestConfirm();})
          .catch(function(){bfvInvestConfirm();});
        return;
      }
    }
    is=Math.max(1,Math.min(T,is+d));
    bfvShow('invest',is); bfvProgress('invest',is);
    document.getElementById('bfv-ibody').scrollTop=0;
  };

  document.addEventListener('input',function(e){
    var f=e.target.closest('.bfv-field');
    if(f)f.classList.remove('bfv-err');
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){bfvClose('pitch');bfvClose('invest');}
  });
})();` }} />
      </body>
    </html>
  );
}
