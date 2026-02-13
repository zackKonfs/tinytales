import "./EnterPage.css";
import EnterPageDecor from "../components/EnterPageDecor";

export default function EnterPage({ setLogin }) {
  return (
    <section className="tt-hero flex items-center">
      <div className="container mx-auto text-center">
        <h1 className="tt-title">TinyTales</h1>

        <section className="tt-banner mt-4">
          <EnterPageDecor variant="enter" />
        </section>

        <div className="mt-10">
            <button className="tt-cta-btn" type="button" onClick={setLogin}>
              ENTER
            </button>
        </div>
      </div>
    </section>
  );
}
