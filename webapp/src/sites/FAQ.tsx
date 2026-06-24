import './FAQ.css'
import PageWrapper from '../components/PageWrapper'

function FAQ() {
    return (
        <PageWrapper>
            <div className="Faq">
                <h1>FAQ</h1>

                <h2>What is this?</h2>
                <p>A web app designed to help you find the perfect <a href="https://survivingmars.paradoxwikis.com/Surviving_Mars:_Relaunched">Surviving Mars Relaunched</a> landing site by filtering resources, disasters, breakthroughs, and topography.</p>


                <h2>What is the difference between Surviving Mars and Relaunched?</h2>
                <p>Surviving Mars: Relaunched is the original game with all DLC bundled plus UI/graphics updates and a new political system, while the 2018 version is the old standalone game.</p>
                <p>If you want a similar app for Surviving Mars check out <a href="https://kingdarboja.github.io/surviving-mars-stats/vanilla">this site</a></p>

                <h2>How do I report a bug, ask for a feature or contribute?</h2>
                <p>Check out the <a href="">Github</a>.</p>
            </div>
        </PageWrapper>
    )
}

export default FAQ