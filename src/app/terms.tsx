import LegalPage from '../components/LegalPage';

// Plain-language draft. Have it reviewed before a public launch.
export default function TermsScreen() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="November 2026"
      sections={[
        {
          heading: 'The service',
          body: [
            'Kaon Tangub lets you order food from stores in Tangub City and have it delivered by a rider. Delivery is available within Tangub City only.',
            'The app is currently a trial version. Stores, menus, prices and features may change.',
          ],
        },
        {
          heading: 'Your account',
          body: ['You sign in with a Google account. You are responsible for activity on your account. Please give a correct delivery address and pin.'],
        },
        {
          heading: 'Orders and payment',
          body: [
            'Prices, delivery fees and service fees are shown before you place an order.',
            'You can cancel an order until a rider accepts it. After that, please contact your rider.',
            'The trial version does not take online payments.',
          ],
        },
        {
          heading: 'Riders',
          body: [
            'Riders must register and be approved by Kaon Tangub before delivering. Riders agree to share their live location while delivering an order.',
            'Kaon Tangub may suspend a rider account at any time.',
          ],
        },
        {
          heading: 'Acceptable use',
          body: ['Do not place fake orders, misuse other people’s information, or interfere with the service.'],
        },
        {
          heading: 'Changes',
          body: ['We may update these terms. Continuing to use Kaon Tangub after a change means you accept the updated terms.'],
        },
      ]}
    />
  );
}
