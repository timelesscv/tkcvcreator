import React from 'react';
import DynamicCountryForm from './DynamicCountryForm';

interface Props {
  onBack: () => void;
}

export default function SaudiForm({ onBack }: Props) {
  return <DynamicCountryForm country="saudi" flag="🇸🇦" onBack={onBack} />;
}
