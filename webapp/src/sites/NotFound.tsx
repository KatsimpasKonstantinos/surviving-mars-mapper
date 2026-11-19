import { Link } from 'react-router';
import './NotFound.css';
import PageWrapper from '../components/PageWrapper';

function NotFound() {
  return (
    <PageWrapper>
      <div className="not-found">
        <h1>404</h1>
        <p>This sector has not been scanned yet.</p>
        <Link className="btn" to="/">
          Back to the map
        </Link>
      </div>
    </PageWrapper>
  );
}

export default NotFound;
