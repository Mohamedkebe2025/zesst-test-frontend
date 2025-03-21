# Minimal Table Design Technical Specification

## Overview
This design implements a clean, minimal table layout with horizontal-only borders, fixed action columns, and responsive behavior. It's built on Ant Design's Table component with custom CSS overrides.

## Key Components

### 1. Table Configuration
```jsx
<Table
  columns={columnsDefinition}
  dataSource={dataSource}
  rowKey="id"
  scroll={{ x: 1200 }}
  bordered={false}
  size="middle"
  className="ant-table-minimal"
  pagination={{ pageSize: 10, position: ['bottomCenter'] }}
/>
```

### 2. Column Definitions
```tsx
const columns = [
  {
    title: 'Column Name',
    dataIndex: 'fieldName',
    key: 'uniqueKey',
    width: 150,        // Fixed width in pixels
    ellipsis: true,    // Truncate with ellipsis if content overflows
  },
  // Action column with fixed position
  {
    title: 'Actions',
    key: 'actions',
    width: 200,
    fixed: 'right' as const,    // Keeps column visible during horizontal scroll
    render: (record) => (
      <Space wrap>
        <Button size="small">Action</Button>
      </Space>
    ),
  }
];
```

### 3. CSS Styling
```css
/* Header styling */
.ant-table-minimal .ant-table-thead>tr>th {
  border-bottom: 2px solid #d9d9d9;
  border-right: none;
  background-color: #fafafa;
  font-weight: 600;
  color: #262626;
}

/* Cell styling */
.ant-table-minimal .ant-table-tbody>tr>td {
  border-bottom: 1px solid #f0f0f0;
  border-right: none;
}

/* Remove bottom border from last row */
.ant-table-minimal .ant-table-tbody>tr:last-child>td {
  border-bottom: none;
}

/* Fixed column styling */
.ant-table-minimal .ant-table-cell-fix-right {
  background: white;
  box-shadow: -6px 0 6px -4px rgba(0, 0, 0, 0.05);
}

/* Row hover effect */
.ant-table-minimal .ant-table-tbody>tr:hover>td {
  background-color: #f5f5f5;
}

/* Fixed column hover effect */
.ant-table-minimal .ant-table-tbody>tr:hover>td.ant-table-cell-fix-right {
  background-color: #f5f5f5;
}
```

## Implementation Details

1. **Responsive Behavior**:
   - `scroll={{ x: 1200 }}` enables horizontal scrolling when table width exceeds container
   - Fixed column widths prevent uneven column sizing
   - `overflow-x-auto` on container ensures scrollbars appear only when needed

2. **Border Control**:
   - `bordered={false}` removes Ant Design's default borders
   - Custom CSS removes vertical borders while maintaining horizontal separators
   - Stronger bottom border (2px) on headers creates visual hierarchy

3. **Fixed Action Column**:
   - `fixed: 'right' as const` pins the action column to the right edge during scrolling
   - Custom shadow effect creates subtle depth for the fixed column
   - Matching hover states ensure consistent appearance

4. **Text Handling**:
   - `ellipsis: true` prevents text overflow by truncating with ellipsis
   - Fixed column widths ensure consistent layout across different data sets

5. **Visual Enhancements**:
   - Subtle header background (#fafafa) differentiates headers from content
   - Row hover effect improves user interaction feedback
   - Centered pagination improves visual balance

## TypeScript Considerations

When using the `fixed` property in column definitions, you must use TypeScript's `as const` assertion to satisfy the type requirements:

```tsx
fixed: 'right' as const  // Correct
fixed: 'right'           // TypeScript error
```

This is because Ant Design's Table component expects the `fixed` property to be of type `FixedType`, which is a union of literal string types.

## Usage Example

Here's a complete example of implementing this table design:

```tsx
import React from 'react';
import { Table, Button, Space } from 'antd';

interface DataItem {
  id: string;
  name: string;
  email: string;
  status: string;
}

const columns = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    width: 150,
    ellipsis: true,
  },
  {
    title: 'Email',
    dataIndex: 'email',
    key: 'email',
    width: 200,
    ellipsis: true,
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    render: (status: string) => (
      <span className={`status-${status.toLowerCase()}`}>
        {status}
      </span>
    ),
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 200,
    fixed: 'right' as const,
    render: (record: DataItem) => (
      <Space wrap>
        <Button size="small">Edit</Button>
        <Button size="small" danger>Delete</Button>
      </Space>
    ),
  }
];

const data: DataItem[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', status: 'Active' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' },
];

const MinimalTable: React.FC = () => (
  <div className="overflow-x-auto">
    <Table
      columns={columns}
      dataSource={data}
      rowKey="id"
      scroll={{ x: 1200 }}
      bordered={false}
      size="middle"
      className="ant-table-minimal"
      pagination={{ pageSize: 10, position: ['bottomCenter'] }}
    />
  </div>
);

export default MinimalTable;
```

Make sure to include the CSS styles in your global stylesheet or component-specific styles.