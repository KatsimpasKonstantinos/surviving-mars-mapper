import './Finder.css'
import PageWrapper from '../components/PageWrapper'

interface FinderProps {
    coordString: string | null;
    setCoordString: (val: string | null) => void;
    mapData: Record<string, any>;
}

function Finder({ coordString, setCoordString, mapData }: FinderProps) {
    console.log(coordString);
    console.log(setCoordString);
    console.log(mapData);

    return (
        <PageWrapper>
            <div className="Finder">
                <h1>Coming soon</h1>
            </div>
        </PageWrapper>
    )
}

export default Finder