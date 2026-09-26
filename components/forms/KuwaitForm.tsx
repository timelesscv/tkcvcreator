import React from 'react';
import DynamicCountryForm from './DynamicCountryForm';

interface Props {
  onBack: () => void;
}

export default function KuwaitForm({ onBack }: Props) {
  return <DynamicCountryForm country="kuwait" flag="🇰🇼" onBack={onBack} />;
}
