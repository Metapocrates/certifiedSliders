export const articleListQuery = `
*[_type == "article" && defined(slug.current)]
| order(publishedAt desc)[0...20]{
  _id, title, "slug": slug.current, excerpt, premium, publishedAt
}`;
