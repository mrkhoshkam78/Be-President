// production.js - Military Equipment Production V3.3.0

const EQUIPMENT_DEFS = {
  missiles: { name: 'موشک', cost: 2.5, time: 2, techReq: 35, infraReq: 30 },
  tanks: { name: 'تانک', cost: 4.0, time: 3, techReq: 40, infraReq: 40 },
  apc: { name: 'نفربر زرهی', cost: 2.0, time: 2, techReq: 30, infraReq: 35 },
  antiAir: { name: 'پدافند هوایی', cost: 3.5, time: 3, techReq: 45, infraReq: 40 },
  antiMissile: { name: 'ضدموشک', cost: 5.0, time: 4, techReq: 55, infraReq: 45 },
  specialForces: { name: 'نیروهای ویژه', cost: 6.0, time: 5, techReq: 55, infraReq: 40, special: true }
};

function produceEquipment(state, type, amount) {
  amount = Math.max(1, Math.min(20, amount || 1));
  const def = EQUIPMENT_DEFS[type];
  if (!def) return { success: false, message: 'تجهیزات نامعتبر' };
  const tech = state.tech?.level || 40;
  const infra = state.economy?.infrastructure || 40;
  if (tech < def.techReq) return { success: false, message: `فناوری لازم: ${def.techReq} (فعلی: ${Math.round(tech)})` };
  if (infra < def.infraReq) return { success: false, message: `زیرساخت لازم: ${def.infraReq}` };
  if (def.special) {
    const check = typeof canProduceEquipment === 'function' ? canProduceEquipment(state, type, amount) : { ok: true };
    if (!check.ok) return check;
  }
  const limitCheck = typeof canProduceEquipment === 'function' ? canProduceEquipment(state, type, amount) : { ok: true };
  if (!limitCheck.ok) return limitCheck;

  const totalCost = Math.round(def.cost * amount * 10) / 10;
  if ((state.economy?.budget || 0) < totalCost) return { success: false, message: 'بودجه کافی نیست', cost: totalCost };

  // Debt / inflation pressure
  const debtRatio = state.economy.gdp > 0 ? state.economy.nationalDebt / state.economy.gdp : 0.5;
  const costMult = debtRatio > 1 ? 1.25 : debtRatio > 0.7 ? 1.1 : 1;
  const finalCost = Math.round(totalCost * costMult * 10) / 10;
  if (state.economy.budget < finalCost) return { success: false, message: 'بودجه کافی نیست (فشار بدهی)', cost: finalCost };

  state.economy.budget -= finalCost;
  const equip = (typeof ensureEquipment === 'function') ? ensureEquipment(state) : (state.military.equipment = state.military.equipment || {});
  // Immediate partial delivery for short times; else project
  if (def.time <= 2) {
    equip[type] = (equip[type] || 0) + amount;
    if (typeof logAction === 'function') logAction(state, `تولید ${amount} ${def.name}`);
    return { success: true, message: `${amount} ${def.name} تولید شد`, cost: finalCost, stock: equip[type] };
  }
  state.projects = state.projects || [];
  state.projects.push({
    id: 'prod_' + type + '_' + Date.now(),
    type: 'production',
    equipType: type,
    amount,
    name: `تولید ${amount} ${def.name}`,
    remaining: def.time,
    total: def.time
  });
  return { success: true, message: `تولید ${amount} ${def.name} آغاز شد (${def.time} ماه)`, cost: finalCost };
}

function processProductionProjects(state) {
  if (!state.projects) return state;
  state.projects = state.projects.filter(p => {
    if (p.type === 'production' && p.remaining != null) {
      p.remaining -= 1;
      if (p.remaining <= 0) {
        const equip = (typeof ensureEquipment === 'function') ? ensureEquipment(state) : (state.military.equipment = {});
        equip[p.equipType] = (equip[p.equipType] || 0) + (p.amount || 1);
        if (typeof pushNotification === 'function') {
          pushNotification(state, { severity: 'success', category: 'military', title: 'تولید تکمیل شد', body: p.name });
        }
        return false;
      }
    }
    return true;
  });
  return state;
}

window.EQUIPMENT_DEFS = EQUIPMENT_DEFS;
window.produceEquipment = produceEquipment;
window.processProductionProjects = processProductionProjects;
