import Header from '@/components/layout/Header';
import ToolGrid from '@/components/dashboard/ToolGrid';
import UsageBar from '@/components/dashboard/UsageBar';
import styles from './page.module.css';
import { ToolCard } from '@/types';

// Default tools configuration
const defaultTools: ToolCard[] = [
  {
    id: 'product-on-white',
    name: 'Product on White',
    description: 'Generate product images with AI',
    icon: '📸',
    href: '/tools/product-on-white',
    enabled: true,
    sortOrder: 0,
  },
  {
    id: 'product-page-description',
    name: 'Product Page Description',
    description: 'Generate web-ready product descriptions',
    icon: '📝',
    href: 'https://claude.ai/public/artifacts/97b551b3-c56f-4881-934e-ebbd4908df85',
    enabled: true,
    isPopup: true,
    sortOrder: 1,
  },
  {
    id: 'ebay-listing',
    name: 'eBay Listing',
    description: 'Create eBay product listings',
    icon: '🏷️',
    href: '/tools/ebay-listing',
    enabled: false,
    sortOrder: 1,
  },
  {
    id: 'amazon-image',
    name: 'Amazon Image',
    description: 'Generate Amazon-ready images',
    icon: '📦',
    href: '/tools/amazon-image',
    enabled: false,
    sortOrder: 2,
  },
  {
    id: 'amazon-description',
    name: 'Amazon Description',
    description: 'Write compelling product descriptions',
    icon: '📝',
    href: '/tools/amazon-description',
    enabled: false,
    sortOrder: 3,
  },
  {
    id: 'history',
    name: 'History',
    description: 'View past generations',
    icon: '📜',
    href: '/history',
    enabled: true,
    sortOrder: 4,
  },
];

export default function DashboardPage() {
  // TODO: Fetch actual usage data from API
  const usageData = {
    apiCalls: 47,
    estimatedCost: 2.35,
  };

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Your Tools</h2>
            <p className={styles.sectionDescription}>
              Select a tool to get started
            </p>
          </div>

          <ToolGrid tools={defaultTools} />
        </section>
      </main>

      <UsageBar
        apiCalls={usageData.apiCalls}
        estimatedCost={usageData.estimatedCost}
      />
    </div>
  );
}
