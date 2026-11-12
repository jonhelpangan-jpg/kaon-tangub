import LegalPage from '../components/LegalPage';

// Plain-language draft describing what the app actually does. Have it reviewed before a public launch.
export default function PrivacyScreen() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="November 2026"
      sections={[
        {
          heading: 'Who we are',
          body: ['Kaon Tangub is a food delivery service for Tangub City, Misamis Occidental, Philippines.'],
        },
        {
          heading: 'What we collect',
          body: [
            'Google account details: when you sign in with Google we receive your name, email address and profile picture. We never receive your Google password.',
            'Order details: the items you order, your delivery address, the delivery pin you set on the map, your note to the rider and your chosen payment method.',
            'Location: customers may choose to share their current location once to set the delivery pin. Riders share their live location while the rider screen is open and they are delivering an order.',
            'Rider details: riders who register give their full name, mobile number, vehicle and plate number.',
          ],
        },
        {
          heading: 'How we use it',
          body: [
            'To take, deliver and track your orders, to show customers where their rider is, to approve rider accounts, and to keep the service safe.',
            'We do not sell your information and we do not use it for advertising.',
          ],
        },
        {
          heading: 'Who can see it',
          body: [
            'The rider who accepts your order sees your name, delivery address, pin and note. Riders can see orders that are waiting for a rider.',
            'A customer sees the name, mobile number and live location of the rider delivering their order, until it is delivered.',
            'Kaon Tangub administrators can see rider registrations and orders.',
            'Our hosting and database providers store the data on our behalf. The map is provided by OpenStreetMap and sign-in by Google.',
          ],
        },
        {
          heading: 'How long we keep it',
          body: ['We keep your account and order history while your account exists. You can ask us to delete your account and its data at any time.'],
        },
        {
          heading: 'Your choices',
          body: [
            'You can decline location access and set your delivery pin by tapping the map instead.',
            'You can sign out at any time from the Profile screen.',
            'To see, correct or delete your information, contact Kaon Tangub.',
          ],
        },
      ]}
    />
  );
}
