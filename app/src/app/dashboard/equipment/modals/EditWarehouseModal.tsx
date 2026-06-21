import React from "react";

interface EditWarehouseModalProps {
  editingWarehouseName: string;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function EditWarehouseModal({
  editingWarehouseName,
  onNameChange,
  onSave,
  onClose,
}: EditWarehouseModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">编辑地理位置名称</h2>
        <input
          type="text"
          value={editingWarehouseName}
          onChange={onNameChange}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
          placeholder="地理位置名称"
          autoFocus
          onKeyDown={e => e.key === 'Enter' && onSave()}
        />
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose}
            className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">取消</button>
          <button onClick={onSave}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">保存</button>
        </div>
      </div>
    </div>
  );
}
