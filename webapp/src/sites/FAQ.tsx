import './FAQ.css';
import PageWrapper from '../components/PageWrapper';

function FAQ() {
  return (
    <PageWrapper>
      <div className="Faq">
        <h1>FAQ</h1>

        <section className="faq-item card">
          <h2>What is this?</h2>
          <p>
            A web app designed to help you find the perfect{' '}
            <a href="https://survivingmars.paradoxwikis.com/Surviving_Mars:_Relaunched">
              Surviving Mars Relaunched
            </a>{' '}
            landing site by filtering resources, disasters, breakthroughs, and topography.
          </p>
        </section>

        <section className="faq-item card">
          <h2>What is the difference between Surviving Mars and Relaunched?</h2>
          <p>
            Surviving Mars: Relaunched is the original game with all DLC bundled plus UI/graphics
            updates and a new political system, while the 2018 version is the old standalone game.
          </p>
          <p>
            If you want a similar app for Surviving Mars check out{' '}
            <a href="https://kingdarboja.github.io/surviving-mars-stats/vanilla">this site</a>
          </p>
        </section>

        <section className="faq-item card">
          <h2>How do I share a landing site?</h2>
          <p>
            The selected coordinate is part of the address bar (for example <code>/?c=12N45E</code>
            ), so you can simply copy the URL or use the link button next to the coordinate.
            Heatmap, 2D/3D view and the breakthrough choices you clicked are included in the link
            too.
          </p>
        </section>

        <section className="faq-item card">
          <h2>Can I use the keyboard on the map?</h2>
          <p>
            Yes. Click the map (or tab to it), then use the arrow keys to move the selection by 1°.
            Hold Shift to move 5°. The coordinate field also accepts loose input such as{' '}
            <code>12n 45e</code>.
          </p>
        </section>

        <section className="faq-item card">
          <h2>What does "First Breakthrough Choice" mean?</h2>
          <p>
            It is the first set of three breakthroughs this landing site offers, predicted from the
            site's seed. The Finder can filter for sites whose first choice includes a specific
            breakthrough, and the Breakthrough page lets you follow the tree further.
          </p>
          <p>
            Hover over a breakthrough to see what it does. The descriptions are taken from the{' '}
            <a href="https://survivingmars.paradoxwikis.com/Breakthrough">Surviving Mars Wiki</a>{' '}
            (licensed under{' '}
            <a href="https://creativecommons.org/licenses/by-nc-sa/3.0/">CC BY-NC-SA 3.0</a>).
          </p>
        </section>

        <section className="faq-item card">
          <h2>How do I report a bug, ask for a feature or contribute?</h2>
          <p>
            Check out the{' '}
            <a href="https://github.com/KatsimpasKonstantinos/surviving-mars-mapper">Github</a>.
          </p>
        </section>
      </div>
    </PageWrapper>
  );
}

export default FAQ;
