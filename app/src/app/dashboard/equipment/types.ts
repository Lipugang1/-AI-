export interface Warehouse { [key: string]: any; id: string; teamId: string; name: string; }
export interface Area { [key: string]: any; id: string; warehouseId: string; name: string; }
export interface Team { [key: string]: any; id: string; name: string; department_id?: string; }
export interface Department { id: string; name: string; code: string; parentId?: string; parent_id?: string; description?: string; }
export interface FireEquipment { [key: string]: any; id: string; warehouseId: string; areaId: string | null; type: string; code: string; }
export interface InspectionRecord { [key: string]: any; id: string; equipmentId: string; status: string; inspectionTime: string; inspectorName: string; }
export interface InspectionRecord { id: string; equipmentId: string; photoKey: string | null; status: string; aiStatus: string | null; aiResult: string | null; inspectionTime: string; inspectorName: string; remarks: string | null; hydrantFrontClear?: string; hydrantBoxAppearance?: string; hydrantSignage?: string; hydrantNoLeakage?: string; hydrantEquipmentComplete?: string; hydrantHoseCondition?: string; hydrantValveCondition?: string; hydrantReelCondition?: string; hydrantNozzleCondition?: string; hydrantNoDebris?: string; extinguisherConfigCorrect?: string; extinguisherWithinExpiration?: string; extinguisherCylinderNormal?: string; extinguisherNozzleNormal?: string; extinguisherPipelineNormal?: string; extinguisherSealIntact?: string; extinguisherPressureNormal?: string; extinguisherCo2WeightNormal?: string; sandNoCaking?: string; createdAt: string; }

export interface TeamWithWarehouses extends Team {
  warehouses: Warehouse[];
}

export interface EquipmentWithRecords extends FireEquipment {
  records?: InspectionRecord[];
}

// 月度检查类型
export interface MonthlyCheck {
  id: string;
  warehouseId: string;
  areaId?: string;
  checkDate: string;
  inspectorName: string;
  photoKey?: string;
  photoUrl?: string;
  aiResult?: string;
  fireHazardRectification?: string;
  evacuationRoute?: string;
  fireTruckChannel?: string;
  fireEquipmentStatus?: string;
  microFireStationStatus?: string;
  electricalSafety?: string;
  keyPersonnelKnowledge?: string;
  keyAreasManagement?: string;
  hazardousMaterialSafety?: string;
  fireControlRoomStatus?: string;
  firePatrolStatus?: string;
  fireSafetySigns?: string;
  otherCheckItems?: string;
  overallConclusion: string;
  remarks?: string;
  createdAt: string;
}

// 月度检查12项配置
export const MONTHLY_CHECK_ITEMS = [
  { key: "fireHazardRectification", label: "a) 火灾隐患的整改情况以及防范措施落实" },
  { key: "evacuationRoute", label: "b) 安全疏散通道、疏散指示标志、应急照明和安全出口情况" },
  { key: "fireTruckChannel", label: "c) 消防车通道、消防水源情况" },
  { key: "fireEquipmentStatus", label: "d) 灭火器材配置及有效情况" },
  { key: "microFireStationStatus", label: "d) 微型消防站配置及有效情况" },
  { key: "electricalSafety", label: "e) 用火、用电有无违章情况" },
  { key: "keyPersonnelKnowledge", label: "f) 消防重点工种人员消防知识的掌握情况" },
  { key: "keyAreasManagement", label: "g) 消防安全重点部位的管理情况" },
  { key: "hazardousMaterialSafety", label: "h) 易燃易爆危险物品和场所防火防爆措施的落实情况" },
  { key: "fireControlRoomStatus", label: "i) 消防(控制室)值班情况和设施运行、记录情况" },
  { key: "firePatrolStatus", label: "j) 防火巡查情况" },
  { key: "fireSafetySigns", label: "k) 消防安全标志的设置情况和完好、有效情况" },
  { key: "otherCheckItems", label: "l) 其他需要检查的内容" },
];
