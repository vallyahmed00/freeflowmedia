import React, { useState, useMemo } from 'react';

const CONTENT_TYPES = {
  Social: [
    'Content Ideas Pack',
    'Instagram Caption', 'Instagram Carousel', 'Facebook Post',
    'LinkedIn Post', 'Twitter / X Thread', 'TikTok Script',
    'YouTube Shorts Script', 'Pinterest Description',
  ],
  Email: [
    'Cold Outreach', 'Newsletter', '3-Email Drip Sequence',
    'Promotional Email', 'Re-engagement Email',
  ],
  'Website Copy': [
    'Hero Headline', 'About Us', 'Service Description',
    'Testimonial Prompt', 'FAQ', 'Meta Tags',
  ],
  Ads: [
    'Google RSA', 'Facebook / Instagram Ad', 'LinkedIn Ad', 'Retargeting Ad',
  ],
  'Long Form': [
    'Blog Outline', 'Full Blog Post', 'Press Release', 'Case Study',
  ],
};

export { CONTENT_TYPES };

export default function ContentTypePanel({ selectedType, onSelect }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return CONTENT_TYPES;
    const q = search.toLowerCase();
    const result = {};
    Object.entries(CONTENT_TYPES).forEach(([cat, types]) => {
      const matches = types.filter(t => t.toLowerCase().includes(q));
      if (matches.length) result[cat] = matches;
    });
    return result;
  }, [search]);

  return (
    <div className="cs-type-panel">
      <div className="cs-type-search">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search types…"
        />
      </div>
      <div className="cs-type-list">
        {Object.entries(filtered).map(([cat, types]) => (
          <div key={cat}>
            <div className="cs-category-label">{cat}</div>
            {types.map(type => (
              <button
                key={type}
                className={`cs-type-item${selectedType === type ? ' active' : ''}`}
                onClick={() => onSelect(type, cat)}
              >
                {type}
              </button>
            ))}
          </div>
        ))}
        {Object.keys(filtered).length === 0 && (
          <div style={{ padding: '16px 12px', fontSize: '0.72rem', color: '#3F3F46' }}>
            No types match "{search}"
          </div>
        )}
      </div>
    </div>
  );
}
