import React from "react";
import { Area } from "../types";

interface AreaManagerModalProps {
  areas: Area[];
  editingAreaId: string;
  editingAreaName: string;
  newAreaName: string;
  onStartEdit: (area: Area) => void;
  onSaveEdit: (areaId: string) => void;
  onCancelEdit: () => void;
  onNameChange: (name: string) => void;
  onDelete: (areaId: string) => void;
  onNewAreaNameChange: (name: string) => void;
  onAddNewArea: () => void;
  onClose: () => void;
}

export default function AreaManagerModal({
  areas,
  editingAreaId,
  editingAreaName,
  newAreaName,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onNameChange,
  onDelete,
  onNewAreaNameChange,
  onAddNewArea,
  onClose,
}: AreaManagerModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span className="font-semibold">区域管理</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(80vh-140px)]">
          {areas.length === 0 ? (
            <div className="text-center text-gray-500 py-8">暂无区域</div>
          ) : (
            <div className="space-y-2">
              {areas.map((area) => (
                <div
                  key={area.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {editingAreaId === area.id ? (
                    <>
                      <input
                        type="text"
                        value={editingAreaName}
                        onChange={(e) => onNameChange(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        autoFocus
                      />
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => onSaveEdit(area.id)}
                          className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                        >
                          保存
                        </button>
                        <button
                          onClick={onCancelEdit}
                          className="px-3 py-1.5 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400 transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-gray-800 font-medium">{area.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onStartEdit(area)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onDelete(area.id)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="删除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newAreaName}
                onChange={(e) => onNewAreaNameChange(e.target.value)}
                placeholder="输入新区域名称..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              />
              <button
                onClick={onAddNewArea}
                disabled={!newAreaName.trim()}
                className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                添加区域
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 bg-gray-50 border-t text-xs text-gray-500">
          提示：删除区域前需先移除该区域下的所有器材和月度检查记录
        </div>
      </div>
    </div>
  );
}
