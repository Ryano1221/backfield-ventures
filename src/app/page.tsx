import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Focus from "@/components/Focus";
import Stage from "@/components/Stage";
import WhyBackfield from "@/components/WhyBackfield";
import Philosophy from "@/components/Philosophy";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <h1 className="sr-only">Backfield Ventures — Venture Capital for Consumer &amp; Sports Companies</h1>
        <Hero />
        <Focus />
        <Stage />
        <WhyBackfield />
        <Philosophy />
<Contact />
      </main>
      <Footer />
    </>
  );
}
