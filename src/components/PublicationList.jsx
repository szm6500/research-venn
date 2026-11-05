export default function PublicationList({ publications }) {
  return <div className="publications-list">{publications.map((publication) => <article className="publication-card" key={publication.id}><div className="venue-badge">{publication.venue}<span>{publication.year}</span><span>{publication.type}</span></div><div><h3>{publication.title}</h3><p className="publication-authors">{publication.authors}</p><p className="publication-takeaway">{publication.takeaway}</p></div></article>)}</div>;
}
