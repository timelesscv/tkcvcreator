import React from 'react';
import DynamicCountryForm from './DynamicCountryForm';

interface Props {
  onBack: () => void;
}

export default function JordanForm({ onBack }: Props) {
  return <DynamicCountryForm country="jordan" flag="🇯🇴" onBack={onBack} />;
}
