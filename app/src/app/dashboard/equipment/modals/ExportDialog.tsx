import React from "react";
import { Warehouse, Area } from "../types";

interface ExportDialogProps {
  warehouses: Warehouse[];
  areas: Area[];
  exportWarehouseId: string;
  exportAreaId: string;
  exportEquipmentType: string;
  exportStartDate: string;
  exportEndDate: string;
  exporting: boolean;
  onWarehouseChange: (id: string) => void;
  onAreaChange: (id: string) => void;
  onEquipmentTypeChange: (type: string) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onExport: () => void;
  onClose: () => void;
}

export default function ExportDialog({
  warehouses,
  areas,
  exportWarehouseId,
  exportAreaId,
  exportEquipmentType,
  exportStartDate,
  exportEndDate,
  exporting,
  onWarehouseChange,
  onAreaChange,
  onEquipmentTypeChange,
  onStartDateChange,
  onEndDateChange,
  onExport,
  onClose,
}: ExportDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">导出巡查记录</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              地理位置
            </label>
            <select
              value={exportWarehouseId}
              onChange={(e) => {
                onWarehouseChange(e.target.value);
                onAreaChange("");
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">全部地理位置</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>

          {exportWarehouseId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                区域
              </label>
              <select
                value={exportAreaId}
                onChange={(e) => onAreaChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部区域</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              器材类型
            </label>
            <select
              value={exportEquipmentType}
              onChange={(e) => onEquipmentTypeChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">全部类型</option>
              <option value="消火栓">消火栓</option>
              <option value="灭火器">灭火器</option>
              <option value="消防沙">消防沙</option>
              <option value="消防架">消防架</option>
              <option value="防汛">防汛</option>
              <option value="防寒">防寒</option>
              <option value="洗眼器">洗眼器</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                开始日期
              </label>
              <input
                type="date"
                value={exportStartDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                结束日期
              </label>
              <input
                type="date"
                value={exportEndDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={onExport}
            disabled={exporting}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {exporting ? "导出中..." : "导出"}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
