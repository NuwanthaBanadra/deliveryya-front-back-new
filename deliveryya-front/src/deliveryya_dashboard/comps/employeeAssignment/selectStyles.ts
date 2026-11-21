import type { CSSObjectWithLabel, GroupBase, StylesConfig } from 'react-select';

export interface SharedSelectOption {
  value: number | string;
  label: string;
}

export const getCustomSelectFieldStyles = <Option extends SharedSelectOption>():
  StylesConfig<Option, false, GroupBase<Option>> => ({
    control: (base, state) => ({
      ...base,
      padding: '0.2rem',
      borderWidth: '2px',
      borderColor: state.isFocused ? '#F59B0F' : '#E5E7EB',
      borderRadius: '0.75rem',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(245, 155, 15, 0.15)' : 'none',
      '&:hover': {
        borderColor: '#FCD34D',
      },
      transition: 'all 0.3s',
      backgroundColor: 'white',
    }),
    option: (base: CSSObjectWithLabel, state: { isSelected: boolean; isFocused: boolean }) => ({
      ...base,
      backgroundColor: state.isSelected
        ? '#F59B0F'
        : state.isFocused
          ? '#FEF3C7'
          : 'white',
      color: state.isSelected ? 'white' : '#1F2937',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: '#F59B0F',
      },
    }),
    placeholder: (base) => ({
      ...base,
      color: '#9CA3AF',
    }),
    menu: (base) => ({
      ...base,
      borderRadius: '0.75rem',
      overflow: 'hidden',
      boxShadow: '0 10px 25px -5px rgba(245, 155, 15, 0.2)',
    }),
  });
