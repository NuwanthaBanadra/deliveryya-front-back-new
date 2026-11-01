import type { StylesConfig } from 'react-select';

export type SelectOption<T extends string | number = string | number> = {
  value: T;
  label: string;
};

export const getAccessSelectStyles = <Option,>(): StylesConfig<Option, false> => ({
  control: (base, state) => ({
    ...base,
    minHeight: 40,
    borderRadius: 8,
    borderColor: state.isFocused ? '#F59B0F' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(245, 155, 15, 0.18)' : 'none',
    ':hover': {
      borderColor: '#F59B0F',
    },
  }),
  menu: (base) => ({
    ...base,
    zIndex: 60,
    borderRadius: 8,
    overflow: 'hidden',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#F59B0F' : state.isFocused ? '#fff7ed' : '#ffffff',
    color: state.isSelected ? '#ffffff' : '#111827',
    cursor: 'pointer',
  }),
});

export const toPageSizeOptions = (sizes: readonly number[]): SelectOption<number>[] => (
  sizes.map((size) => ({ value: size, label: String(size) }))
);

export const getPageSizeOption = (
  options: SelectOption<number>[],
  pageSize: number
): SelectOption<number> => (
  options.find((option) => option.value === pageSize) ?? { value: pageSize, label: String(pageSize) }
);

export const allAccessTypeOption: SelectOption<number> = {
  value: 0,
  label: 'All access types',
};

export const allAccessLevelOption: SelectOption<number> = {
  value: 0,
  label: 'All access levels',
};
