import BackfieldDeck from "./BackfieldDeck";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function DeckPage() {
  return <BackfieldDeck />;
}
