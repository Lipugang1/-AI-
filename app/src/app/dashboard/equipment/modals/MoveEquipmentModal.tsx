import React from "react";
import { Area } from "../types";

interface MoveEquipmentModalProps {
  areas: Area[];
  movingFromAreaId: string;
  movingToAreaId: string;
  movingEquipmentCount: number;
  movingMonthlyCheckCount: number;
  onTargetAreaChange: (id: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export default function MoveEquipmentModal({
  areas,
  movingFromAreaId,
  movingToAreaId,
  movingEquipmentCount,
  movingMonthlyCheckCount,
  onTargetAreaChange,
  onConfirm,
  onClose,
}: MoveEquipmentModalProps) {
  const availableAreas = areas.filter(a => a.id !== movingFromAreaId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>📦</span> 移动资源
          </h3>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-1"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-amber-800 text-sm">
              ⚠️ 该区域下有以下资源，无法直接删除：
            </p>
            <ul className="text-amber-700 text-sm mt-2 list-disc list-inside">
              {movingEquipmentCount > 0 && (
                <li><strong>{movingEquipmentCount}</strong> 个器材</li>
              )}
              {movingMonthlyCheckCount > 0 && (
                <li><strong>{movingMonthlyCheckCount}</strong> 条月度检查记录</li>
              )}
            </ul>
            <p className="text-amber-700 text-sm mt-2">
              请先将这些资源移动到其他区域：
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择目标区域：
            </label>
            <select
              value={movingToAreaId}
              onChange={(e) => onTargetAreaChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">请选择区域</option>
              {availableAreas.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {availableAreas.length === 0 && (
            <p className="text-red-500 text-sm mb-4">
              没有其他可用的区域，请先创建新区域
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onConfirm}
              disabled={!movingToAreaId || availableAreas.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              确认移动并删除区域
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
