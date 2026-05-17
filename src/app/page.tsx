import LeftBar from "@/components/LeftBar";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Ticker from "@/components/Ticker";
import Focus from "@/components/Focus";
import Stage from "@/components/Stage";
import Statement from "@/components/Statement";
import WhyBackfield from "@/components/WhyBackfield";
import Philosophy from "@/components/Philosophy";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import ParticleBackground from "@/components/ParticleBackground";

export default function Home() {
  return (
    <>
      <ParticleBackground />
      <LeftBar />
      <Nav />
      <main>
        <h1 className="sr-only">
          Backfield Ventures — Austin, TX Venture Capital for Sports, CPG &amp; Consumer Companies
        </h1>
        <Hero />
        <Ticker />
        <Focus />
        <Stage />
        <Statement />
        <WhyBackfield />
        <Philosophy />
        <Contact />
      </main>
      <Footer />
      <ScrollReveal />
    </>
  );
}
