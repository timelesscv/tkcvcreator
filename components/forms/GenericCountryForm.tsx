import React from 'react';
import DynamicCountryForm from './DynamicCountryForm';

interface Props {
  country?: string;
  flag?: string;
  onBack: () => void;
}

export default function GenericCountryForm({ country = 'generic', flag = '🏳️', onBack }: Props) {
  return <DynamicCountryForm country={country} flag={flag} onBack={onBack} />;
}
