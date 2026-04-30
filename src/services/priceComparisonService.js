import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  doc,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';

// ==================== PRICE COMPARISONS ====================

export const priceComparisonsCollection = collection(db, 'priceComparisons');

export const savePriceComparison = async (data) => {
  return await addDoc(priceComparisonsCollection, {
    businessType: data.businessType || '',
    industry: data.industry || '',
    location: data.location || '',
    targetMarket: data.targetMarket || '',
    productService: data.productService || '',
    priceRange: data.priceRange || '',
    currentPricing: data.currentPricing || '',
    competitors: data.competitors || [],
    comparison: data.comparison || {},
    userEmail: data.userEmail || null,
    userName: data.userName || null,
    status: data.status || 'generated', // generated, viewed, exported, emailed
    generatedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const getAllPriceComparisons = async (filters = {}) => {
  let q = priceComparisonsCollection;

  if (filters.status) {
    q = query(q, where('status', '==', filters.status));
  }

  if (filters.industry) {
    q = query(q, where('industry', '==', filters.industry));
  }

  q = query(q, orderBy('generatedAt', 'desc'));

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const getPriceComparisonById = async (id) => {
  const docRef = doc(db, 'priceComparisons', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

export const deletePriceComparison = async (id) => {
  const docRef = doc(db, 'priceComparisons', id);
  return await deleteDoc(docRef);
};

export const updatePriceComparisonStatus = async (id, data) => {
  const docRef = doc(db, 'priceComparisons', id);
  return await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const getPriceComparisonByUser = async (email) => {
  const q = query(
    priceComparisonsCollection,
    where('userEmail', '==', email),
    orderBy('generatedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// ==================== EXPORT FUNCTIONS ====================

export const exportPriceComparisonAsPDF = (comparisonData) => {
  const {
    reportTitle,
    businessSummary,
    marketOverview,
    competitorAnalysis,
    pricingStrategies,
    recommendations,
    visualComparisonData
  } = comparisonData;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${reportTitle}</title>
  <style>
    @media print {
      body { margin: 0; }
      .page-break { page-break-before: always; }
    }
    body { font-family: 'Arial', sans-serif; max-width: 900px; margin: 0 auto; padding: 40px; line-height: 1.6; color: #333; }
    h1 { color: #9333EA; border-bottom: 3px solid #9333EA; padding-bottom: 10px; font-size: 28px; }
    h2 { color: #9333EA; margin-top: 30px; font-size: 22px; }
    h3 { color: #6B21A8; font-size: 18px; }
    h4 { color: #7C3AED; font-size: 16px; }
    .meta { color: #666; font-size: 14px; margin-bottom: 30px; }
    .competitor { background: #F9FAFB; padding: 20px; border-left: 4px solid #9333EA; margin: 20px 0; border-radius: 4px; }
    .pricing-tier { background: #F3F4F6; padding: 15px; margin: 10px 0; border-radius: 4px; }
    .price { font-size: 24px; font-weight: bold; color: #9333EA; }
    .recommendation { background: #FEF3C7; padding: 15px; border-left: 4px solid #F59E0B; margin: 15px 0; }
    .action-item { background: #DBEAFE; padding: 10px; margin: 10px 0; border-left: 3px solid #3B82F6; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #E5E7EB; padding: 12px; text-align: left; }
    th { background: #9333EA; color: white; }
    tr:nth-child(even) { background: #F9FAFB; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .badge-high { background: #FEE2E2; color: #DC2626; }
    .badge-medium { background: #FEF3C7; color: #D97706; }
    .badge-low { background: #D1FAE5; color: #059669; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #E5E7EB; text-align: center; color: #999; font-size: 12px; }
    ul, ol { padding-left: 20px; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <h1>${reportTitle}</h1>
  <p class="meta">Generated on ${new Date().toLocaleDateString()} | Drift Studio - Price Comparison Tool</p>

  <h2>Business Summary</h2>
  <p><strong>Business Type:</strong> ${businessSummary.businessType}</p>
  <p><strong>Industry:</strong> ${businessSummary.industry}</p>
  <p><strong>Location:</strong> ${businessSummary.location}</p>
  <p><strong>Target Market:</strong> ${businessSummary.targetMarket}</p>

  <h2>Market Overview</h2>
  <p><strong>Market Size:</strong> ${marketOverview.marketSize}</p>
  <p><strong>Growth Rate:</strong> ${marketOverview.growthRate}</p>
  <p><strong>Average Price Point:</strong> ${marketOverview.averagePricePoint}</p>
  
  <h3>Market Price Range</h3>
  <p><strong>Low:</strong> ${marketOverview.priceRange.low} | <strong>High:</strong> ${marketOverview.priceRange.high} | <strong>Median:</strong> ${marketOverview.priceRange.median}</p>

  <div class="page-break"></div>

  <h2>Competitor Analysis</h2>
  ${competitorAnalysis.map((competitor, i) => `
    <div class="competitor">
      <h3>#${competitor.rank} ${competitor.companyName}</h3>
      <p><strong>Market Position:</strong> <span class="badge">${competitor.marketPosition}</span></p>
      <p><strong>Market Share:</strong> ${competitor.marketShare || 'N/A'}</p>
      
      <h4>Pricing Structure</h4>
      ${competitor.pricing.basic ? `
        <div class="pricing-tier">
          <strong>${competitor.pricing.basic.name}:</strong> <span class="price">${competitor.pricing.basic.price}</span> ${competitor.pricing.basic.frequency}
          <ul>
            ${competitor.pricing.basic.features.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      ${competitor.pricing.standard ? `
        <div class="pricing-tier">
          <strong>${competitor.pricing.standard.name}:</strong> <span class="price">${competitor.pricing.standard.price}</span> ${competitor.pricing.standard.frequency}
          <ul>
            ${competitor.pricing.standard.features.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      ${competitor.pricing.premium ? `
        <div class="pricing-tier">
          <strong>${competitor.pricing.premium.name}:</strong> <span class="price">${competitor.pricing.premium.price}</span> ${competitor.pricing.premium.frequency}
          <ul>
            ${competitor.pricing.premium.features.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${competitor.website ? `<p><strong>Website:</strong> <a href="${competitor.website}">${competitor.website}</a></p>` : ''}
      
      <h4>Strengths</h4>
      <ul>${competitor.strengths.map(s => `<li>${s}</li>`).join('')}</ul>
      
      <h4>Weaknesses</h4>
      <ul>${competitor.weaknesses.map(w => `<li>${w}</li>`).join('')}</ul>
    </div>
  `).join('')}

  <div class="page-break"></div>

  <h2>Pricing Strategies</h2>
  ${pricingStrategies.map((strategy, i) => `
    <div class="competitor">
      <h3>${i + 1}. ${strategy.strategy}</h3>
      <p>${strategy.description}</p>
      <p><strong>Best For:</strong> ${strategy.bestFor}</p>
      ${strategy.recommendedPrice ? `<p><strong>Recommended Price:</strong> <span class="price">${strategy.recommendedPrice}</span></p>` : ''}
      
      <h4>Pros</h4>
      <ul>${strategy.pros.map(p => `<li>${p}</li>`).join('')}</ul>
      
      <h4>Cons</h4>
      <ul>${strategy.cons.map(c => `<li>${c}</li>`).join('')}</ul>
    </div>
  `).join('')}

  <div class="page-break"></div>

  <h2>Recommendations</h2>
  
  <div class="recommendation">
    <h3>Optimal Pricing Structure</h3>
    <p><strong>Basic Tier:</strong> <span class="price">${recommendations.optimalPricing.basic}</span></p>
    <p><strong>Standard Tier:</strong> <span class="price">${recommendations.optimalPricing.standard}</span></p>
    <p><strong>Premium Tier:</strong> <span class="price">${recommendations.optimalPricing.premium}</span></p>
  </div>

  <h3>Market Positioning</h3>
  <p>${recommendations.positioning}</p>

  <h3>Key Differentiators</h3>
  <ul>${recommendations.keyDifferentiators.map(d => `<li>${d}</li>`).join('')}</ul>

  <h3>Pricing Tactics</h3>
  <ul>${recommendations.pricingTactics.map(t => `<li>${t}</li>`).join('')}</ul>

  <h3>Action Items</h3>
  ${recommendations.actionItems.map((action, i) => `
    <div class="action-item">
      <p><span class="badge badge-${action.priority.toLowerCase()}">${action.priority}</span> <strong>${action.action}</strong></p>
      <p><strong>Timeline:</strong> ${action.timeline}</p>
      <p><strong>Expected Impact:</strong> ${action.expectedImpact}</p>
    </div>
  `).join('')}

  ${visualComparisonData ? `
    <div class="page-break"></div>
    <h2>Feature-by-Feature Price Comparison</h2>
    <table>
      <thead>
        <tr>
          <th>Feature</th>
          <th>Your Business</th>
          ${Object.keys(visualComparisonData.pricePerFeature[0] || {})
            .filter(key => key !== 'feature' && key !== 'yourBusiness')
            .map(key => `<th>${key}</th>`)
            .join('')}
        </tr>
      </thead>
      <tbody>
        ${visualComparisonData.pricePerFeature.map(row => `
          <tr>
            <td><strong>${row.feature}</strong></td>
            <td>${row.yourBusiness}</td>
            ${Object.entries(row)
              .filter(([key]) => key !== 'feature' && key !== 'yourBusiness')
              .map(([, value]) => `<td>${value}</td>`)
              .join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>

    ${visualComparisonData.valueScore ? `
      <h2>Value Score Comparison</h2>
      <table>
        <thead>
          <tr>
            <th>Business</th>
            <th>Value Score (out of 10)</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(visualComparisonData.valueScore).map(([business, score]) => `
            <tr>
              <td><strong>${business}</strong></td>
              <td>${score}/10</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}
  ` : ''}

  <div class="footer">
    <p>Generated by <strong>Drift Studio - Price Comparison Tool</strong></p>
    <p>https://freeflowmedia.com | Comprehensive competitive pricing analysis</p>
  </div>
</body>
</html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${reportTitle.replace(/\s+/g, '-')}.html`;
  link.click();
  URL.revokeObjectURL(url);
};

// ==================== ANALYTICS ====================

export const getPriceComparisonStats = async () => {
  const snapshot = await getDocs(priceComparisonsCollection);
  const comparisons = snapshot.docs.map(doc => doc.data());

  const stats = {
    total: comparisons.length,
    generated: comparisons.filter(c => c.status === 'generated').length,
    viewed: comparisons.filter(c => c.status === 'viewed').length,
    exported: comparisons.filter(c => c.status === 'exported').length,
    byIndustry: comparisons.reduce((acc, curr) => {
      const industry = curr.industry || 'Unknown';
      acc[industry] = (acc[industry] || 0) + 1;
      return acc;
    }, {})
  };

  return stats;
};
