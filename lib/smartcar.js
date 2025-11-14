(function(global){
  'use strict';

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const PENALTY_LIBRARY = {
    touch_cone: { description: '触碰赛道边界', penaltyMultiplier: 1.0 },
    insulation: { description: '误碰绝缘区域', penaltyMultiplier: 1.4 },
    vision_lost: { description: '视觉系统丢帧', penaltyMultiplier: 1.2 },
    part_drop: { description: '部件松动脱落', penaltyMultiplier: 1.6 },
    hardware_lock: { description: '现场修改软硬件被判罚', penaltyMultiplier: 2.2, disqualifyChance: 0.35 }
  };

  const GROUP_TRACKS = {
    '飞檐走壁': [
      {
        id: 'straight',
        name: '起跑直道',
        type: '速度冲刺',
        difficulty: 35,
        baseTimeSec: 16,
        penaltyTimeSec: 5,
        scoreWeight: 1.0,
        abilityWeights: { hardwareDesign: 0.4, motionPlanning: 0.35, algorithmOptimization: 0.25 },
        failReasons: ['出发不稳偏离跑线', '出弯时车尾摆动'],
        successFlavor: '顺利完成起跑直道，车身姿态稳定。',
        penaltyTag: 'touch_cone'
      },
      {
        id: 'right_angle',
        name: '直角弯',
        type: '结构挑战',
        difficulty: 52,
        baseTimeSec: 24,
        penaltyTimeSec: 9,
        scoreWeight: 1.15,
        abilityWeights: { motionPlanning: 0.4, algorithmOptimization: 0.35, hardwareDesign: 0.25 },
        failReasons: ['拐弯压线，被判定出界', '制动过猛导致减速过度'],
        successFlavor: '直角弯顺利过弯，车模紧贴内线。',
        penaltyTag: 'touch_cone'
      },
      {
        id: 'diamond_ring',
        name: '菱形环岛',
        type: '姿态控制',
        difficulty: 68,
        baseTimeSec: 32,
        penaltyTimeSec: 12,
        scoreWeight: 1.25,
        abilityWeights: { motionPlanning: 0.4, hardwareDesign: 0.3, sensorRecognition: 0.3 },
        failReasons: ['环岛进出口速度过高，出现漂移', '对角姿态不稳，环岛耗时过长'],
        successFlavor: '菱形环岛切线漂亮，保持了高速通过。',
        penaltyTag: 'touch_cone'
      },
      {
        id: 'seesaw',
        name: '跷跷板',
        type: '结构挑战',
        difficulty: 82,
        baseTimeSec: 36,
        penaltyTimeSec: 16,
        scoreWeight: 1.35,
        abilityWeights: { hardwareDesign: 0.45, motionPlanning: 0.3, sensorRecognition: 0.25 },
        failReasons: ['上板角度过大导致回弹', '重心控制不当，跷跷板未完全压下'],
        successFlavor: '跷跷板顺利落板，通过流程丝滑。',
        penaltyTag: 'part_drop'
      },
      {
        id: 'ceiling',
        name: '天花板路段',
        type: '姿态控制',
        difficulty: 92,
        baseTimeSec: 40,
        penaltyTimeSec: 18,
        scoreWeight: 1.45,
        abilityWeights: { hardwareDesign: 0.4, motionPlanning: 0.35, algorithmOptimization: 0.25 },
        failReasons: ['吸附力不足，车辆下滑', '姿态调整滞后，偏离吸附轨道'],
        successFlavor: '完成天花板路段，吸附系统表现稳定。',
        penaltyTag: 'part_drop'
      }
    ],
    '疯狂电路': [
      {
        id: 'straight_line',
        name: '直线电路段',
        type: '速度冲刺',
        difficulty: 40,
        baseTimeSec: 18,
        penaltyTimeSec: 6,
        scoreWeight: 1.0,
        abilityWeights: { algorithmOptimization: 0.35, sensorRecognition: 0.35, hardwareDesign: 0.3 },
        failReasons: ['信号采样延迟，速度下降', '起步过猛导致电流保护触发'],
        successFlavor: '直线段高速通过，电流输出稳定。',
        penaltyTag: 'touch_cone'
      },
      {
        id: 'junction',
        name: '十字路口识别',
        type: '传感判定',
        difficulty: 60,
        baseTimeSec: 26,
        penaltyTimeSec: 11,
        scoreWeight: 1.15,
        abilityWeights: { sensorRecognition: 0.4, algorithmOptimization: 0.4, motionPlanning: 0.2 },
        failReasons: ['未能识别转向标识', '红绿灯状态判断超时'],
        successFlavor: '十字路口识别精准，转向动作干净利落。',
        penaltyTag: 'vision_lost'
      },
      {
        id: 'insulation',
        name: '绝缘区域穿越',
        type: '传感判定',
        difficulty: 78,
        baseTimeSec: 34,
        penaltyTimeSec: 20,
        scoreWeight: 1.3,
        abilityWeights: { sensorRecognition: 0.45, algorithmOptimization: 0.35, hardwareDesign: 0.2 },
        failReasons: ['摄像头误判红区，触碰绝缘区域', '识别帧率不足，停留过久'],
        successFlavor: '绝缘区域精准绕开，识别稳定。',
        penaltyTag: 'insulation'
      },
      {
        id: 'target_piece',
        name: '目标棋子击打',
        type: '执行控制',
        difficulty: 86,
        baseTimeSec: 32,
        penaltyTimeSec: 14,
        scoreWeight: 1.25,
        abilityWeights: { algorithmOptimization: 0.4, motionPlanning: 0.35, hardwareDesign: 0.25 },
        failReasons: ['击打力度不足未能弹出棋子', '定位偏差导致目标偏移'],
        successFlavor: '成功击出目标棋子，动作干净利落。',
        penaltyTag: 'vision_lost'
      }
    ],
    '轮腿穿越': [
      {
        id: 'slalom',
        name: '往返绕桩',
        type: '姿态控制',
        difficulty: 42,
        baseTimeSec: 28,
        penaltyTimeSec: 8,
        scoreWeight: 1.05,
        abilityWeights: { motionPlanning: 0.35, hardwareDesign: 0.3, algorithmOptimization: 0.35 },
        failReasons: ['绕桩时轮腿抖动，碰倒路标', '绕桩路径偏移过大'],
        successFlavor: '往返绕桩节奏流畅，姿态切换顺畅。',
        penaltyTag: 'touch_cone'
      },
      {
        id: 'bridge',
        name: '单边桥',
        type: '结构挑战',
        difficulty: 70,
        baseTimeSec: 36,
        penaltyTimeSec: 14,
        scoreWeight: 1.25,
        abilityWeights: { hardwareDesign: 0.45, motionPlanning: 0.35, sensorRecognition: 0.2 },
        failReasons: ['单边桥上侧倾过大', '减震参数不合适导致反复晃动'],
        successFlavor: '单边桥保持平衡，重心控制精准。',
        penaltyTag: 'part_drop'
      },
      {
        id: 'grassland',
        name: '草地颠簸段',
        type: '地形适应',
        difficulty: 76,
        baseTimeSec: 38,
        penaltyTimeSec: 18,
        scoreWeight: 1.2,
        abilityWeights: { hardwareDesign: 0.35, motionPlanning: 0.25, systemModeling: 0.4 },
        failReasons: ['轮腿同步失衡导致车身跳动', '地形识别滞后，速度下降'],
        successFlavor: '草地段保持稳定，轮腿动作协调。',
        penaltyTag: 'part_drop'
      },
      {
        id: 'dragon_gate',
        name: '坡道（鲤鱼跃龙门）',
        type: '执行控制',
        difficulty: 88,
        baseTimeSec: 40,
        penaltyTimeSec: 20,
        scoreWeight: 1.3,
        abilityWeights: { motionPlanning: 0.4, algorithmOptimization: 0.35, hardwareDesign: 0.25 },
        failReasons: ['坡顶前速度不够，倒滑', '冲坡角度失衡导致摆尾'],
        successFlavor: '坡道冲顶成功，落地姿态平稳。',
        penaltyTag: 'part_drop'
      }
    ],
    '人工智能视觉': [
      {
        id: 'ai_straight',
        name: '自适应直道',
        type: '速度冲刺',
        difficulty: 34,
        baseTimeSec: 18,
        penaltyTimeSec: 6,
        scoreWeight: 1.0,
        abilityWeights: { sensorRecognition: 0.35, algorithmOptimization: 0.35, hardwareDesign: 0.3 },
        failReasons: ['光照变化导致曝光延迟', '相机白平衡调整过慢'],
        successFlavor: '直道识别顺利，曝光调节及时。',
        penaltyTag: 'vision_lost'
      },
      {
        id: 'ai_curve',
        name: '弯道跟踪',
        type: '传感判定',
        difficulty: 58,
        baseTimeSec: 28,
        penaltyTimeSec: 10,
        scoreWeight: 1.1,
        abilityWeights: { sensorRecognition: 0.4, motionPlanning: 0.35, algorithmOptimization: 0.25 },
        failReasons: ['弯道跟踪漂移，贴边超标', '画面噪声过大导致识别延迟'],
        successFlavor: '弯道跟踪精准，路线紧凑无摆动。',
        penaltyTag: 'vision_lost'
      },
      {
        id: 'obstacle',
        name: '障碍箱识别',
        type: '传感判定',
        difficulty: 74,
        baseTimeSec: 34,
        penaltyTimeSec: 16,
        scoreWeight: 1.25,
        abilityWeights: { sensorRecognition: 0.45, algorithmOptimization: 0.35, motionPlanning: 0.2 },
        failReasons: ['障碍识别耗时过长', '避障路径规划过度保守'],
        successFlavor: '障碍识别完成，规划绕行路线顺畅。',
        penaltyTag: 'vision_lost'
      },
      {
        id: 'target_zone',
        name: '目标区域精准停靠',
        type: '执行控制',
        difficulty: 86,
        baseTimeSec: 38,
        penaltyTimeSec: 18,
        scoreWeight: 1.35,
        abilityWeights: { algorithmOptimization: 0.35, sensorRecognition: 0.35, motionPlanning: 0.3 },
        failReasons: ['停车距离偏差超标', '光照突变导致识别丢失'],
        successFlavor: '精准停靠目标区域，姿态稳定。',
        penaltyTag: 'vision_lost'
      }
    ]
  };

  const GROUP_CONFIG = {
    '飞檐走壁': {
      display: '飞檐走壁组',
      coreAttrs: ['hardwareDesign', 'motionPlanning'],
      training: {
        knowledgeBonus: { hardwareDesign: 1.28, motionPlanning: 1.18 },
        knowledgeFallbackMultiplier: 0.9,
        abilityGain: { thinking: 1.12, coding: 0.95 }
      },
      elementAdjustments: {
        seesaw: { successBonus: 0.08, abilityBonus: 6 },
        ceiling: { successBonus: 0.05, abilityBonus: 4 }
      },
      track: GROUP_TRACKS['飞檐走壁']
    },
    '疯狂电路': {
      display: '疯狂电路组',
      coreAttrs: ['sensorRecognition', 'algorithmOptimization'],
      training: {
        knowledgeBonus: { sensorRecognition: 1.25, algorithmOptimization: 1.2 },
        knowledgeFallbackMultiplier: 0.92,
        abilityGain: { thinking: 1.08, coding: 1.08 }
      },
      elementAdjustments: {
        insulation: { successBonus: 0.1 },
        target_piece: { abilityBonus: 4 }
      },
      track: GROUP_TRACKS['疯狂电路']
    },
    '轮腿穿越': {
      display: '轮腿穿越组',
      coreAttrs: ['hardwareDesign', 'systemModeling'],
      training: {
        knowledgeBonus: { hardwareDesign: 1.22, systemModeling: 1.18 },
        knowledgeFallbackMultiplier: 0.9,
        abilityGain: { thinking: 1.05, coding: 1.02 }
      },
      elementAdjustments: {
        bridge: { successBonus: 0.07, abilityBonus: 5 },
        grassland: { successBonus: 0.05 }
      },
      track: GROUP_TRACKS['轮腿穿越']
    },
    '人工智能视觉': {
      display: '人工智能视觉组',
      coreAttrs: ['sensorRecognition', 'algorithmOptimization'],
      training: {
        knowledgeBonus: { sensorRecognition: 1.3, algorithmOptimization: 1.18 },
        knowledgeFallbackMultiplier: 0.93,
        abilityGain: { thinking: 1.04, coding: 1.12 }
      },
      elementAdjustments: {
        obstacle: { successBonus: 0.07, abilityBonus: 3 },
        target_zone: { successBonus: 0.05 }
      },
      track: GROUP_TRACKS['人工智能视觉']
    }
  };

  const GROUPS = Object.keys(GROUP_CONFIG);

  const KNOWLEDGE_TO_ATTR = {
    '数据结构': 'hardwareDesign',
    '硬件设计': 'hardwareDesign',
    '图论': 'sensorRecognition',
    '传感与识别': 'sensorRecognition',
    '字符串': 'motionPlanning',
    '运动规划': 'motionPlanning',
    '数学': 'systemModeling',
    '系统建模': 'systemModeling',
    '动态规划': 'algorithmOptimization',
    '算法优化': 'algorithmOptimization',
    'DP': 'algorithmOptimization'
  };

  function getDefaultGroup(){
    return GROUPS[0];
  }

  function assignGroup(student, index){
    if(!student) return getDefaultGroup();
    if(student.group && GROUP_CONFIG[student.group]) return student.group;
    const idx = typeof index === 'number' ? index : Math.floor(Math.random() * GROUPS.length);
    const group = GROUPS[idx % GROUPS.length] || getDefaultGroup();
    student.group = group;
    return group;
  }

  function ensureGroup(student){
    if(!student) return getDefaultGroup();
    if(!student.group || !GROUP_CONFIG[student.group]){
      assignGroup(student, Math.floor(Math.random() * GROUPS.length));
    }
    return student.group;
  }

  function mapKnowledgeToAttr(type){
    return KNOWLEDGE_TO_ATTR[type] || null;
  }

  function getTrainingKnowledgeMultiplier(group, attr){
    const cfg = GROUP_CONFIG[group];
    if(!cfg || !attr){
      return 1.0;
    }
    const bonus = cfg.training?.knowledgeBonus?.[attr];
    if(typeof bonus === 'number') return bonus;
    const fallback = cfg.training?.knowledgeFallbackMultiplier;
    return typeof fallback === 'number' ? fallback : 1.0;
  }

  function getAbilityGainMultipliers(group){
    const cfg = GROUP_CONFIG[group];
    return {
      thinking: cfg?.training?.abilityGain?.thinking || 1.0,
      coding: cfg?.training?.abilityGain?.coding || 1.0
    };
  }

  function prepareContestTracks(contestDef){
    if(!contestDef) return null;
    const difficulty = Number(contestDef.difficulty || 180);
    const difficultyScale = clamp(difficulty / 180, 0.6, 1.65);
    const timeScale = clamp(0.8 + difficulty / 620, 0.85, 1.5);
    const penaltyScale = clamp(0.75 + difficulty / 500, 0.8, 1.85);

    const trackByGroup = {};
    let templateGroup = null;
    let maxTimeSec = 0;
    let minTrackLength = Infinity;

    for(const group of GROUPS){
      const cfg = GROUP_CONFIG[group];
      const baseTrack = cfg.track || [];
      const scaledTrack = baseTrack.map(element => {
        const scaled = {
          id: element.id,
          name: element.name,
          type: element.type || '赛道元素',
          difficulty: Math.max(1, Math.round(element.difficulty * difficultyScale)),
          baseTimeSec: Math.max(4, Math.round(element.baseTimeSec * timeScale)),
          penaltyTimeSec: Math.max(2, Math.round(element.penaltyTimeSec * penaltyScale)),
          scoreWeight: element.scoreWeight || 1,
          abilityWeights: Object.assign({}, element.abilityWeights || {}),
          failReasons: element.failReasons ? element.failReasons.slice() : [],
          successFlavor: element.successFlavor || null,
          penaltyTag: element.penaltyTag || null,
          disqualifyOnPenalty: element.disqualifyOnPenalty || null
        };
        return scaled;
      });
      trackByGroup[group] = scaledTrack;
      const totalTime = scaledTrack.reduce((sum, el) => sum + el.baseTimeSec + el.penaltyTimeSec * 1.5, 0);
      if(totalTime > maxTimeSec){
        maxTimeSec = totalTime;
        templateGroup = group;
      }
      if(scaledTrack.length < minTrackLength){
        minTrackLength = scaledTrack.length;
      }
    }

    if(!templateGroup){
      templateGroup = getDefaultGroup();
    }

    const templateTrack = (trackByGroup[templateGroup] || []).map(el => Object.assign({}, el));
    const totalWeight = templateTrack.reduce((sum, el) => sum + (el.scoreWeight || 1), 0) || templateTrack.length || 1;

    const trackLength = templateTrack.length || 1;
    if(!isFinite(minTrackLength) || minTrackLength <= 0) minTrackLength = trackLength;

    for(const group of GROUPS){
      const track = trackByGroup[group];
      for(let i = 0; i < track.length; i++){
        const el = track[i];
        const weight = el.scoreWeight || 1;
        const targetScore = (contestDef.maxScore ? contestDef.maxScore * weight / totalWeight : 100 / trackLength);
        el.targetScore = targetScore;
        const timeWindow = el.baseTimeSec + el.penaltyTimeSec * 1.5;
        el.scorePerSecond = targetScore / Math.max(timeWindow, 10);
      }
    }

    const tickIntervalMinutes = 0.5;
    const durationMinutes = Math.max(4, Math.ceil(maxTimeSec / 60 + 1));
    const scorePerSecond = contestDef.maxScore ? contestDef.maxScore / Math.max(maxTimeSec, 120) : 0.25;

    return {
      templateTrack,
      trackByGroup,
      totalWeight,
      trackLength,
      minTrackLength,
      durationMinutes,
      estimatedMaxTimeSec: maxTimeSec,
      tickIntervalMinutes,
      scorePerSecond
    };
  }

  function calculateAbility(student, element){
    if(!student || !element) return 50;
    const weights = element.abilityWeights || {};
    let total = 0;
    let weightSum = 0;
    for(const key of Object.keys(weights)){
      const attrValue = Number(student[key] || 0);
      const w = weights[key];
      total += attrValue * w;
      weightSum += w;
    }
    if(weightSum <= 0){
      const avg = (Number(student.hardwareDesign || 0) + Number(student.sensorRecognition || 0) +
        Number(student.motionPlanning || 0) + Number(student.systemModeling || 0) + Number(student.algorithmOptimization || 0)) / 5;
      return avg;
    }
    return total / weightSum;
  }

  function evaluateElement(student, element, ctx){
    const abilityScore = calculateAbility(student, element);
    const mental = typeof student.getMentalIndex === 'function' ? student.getMentalIndex() : Number(student.mental || 50);
    let successRate = 0.55 + (abilityScore - element.difficulty) / 160;
    successRate *= 0.9 + mental / 250;

    const cfg = GROUP_CONFIG[student.group];
    const adjustments = cfg?.elementAdjustments?.[element.id];
    if(adjustments){
      if(typeof adjustments.successBonus === 'number'){
        successRate += adjustments.successBonus;
      }
      if(typeof adjustments.abilityBonus === 'number'){
        successRate += adjustments.abilityBonus / 120;
      }
    }

    successRate = clamp(successRate, 0.08, 0.98);

    return {
      abilityScore,
      successRate,
      mental
    };
  }

  function computeElementTime(student, element, evaluation){
    const base = element.baseTimeSec;
    const abilityDelta = evaluation.abilityScore - element.difficulty;
    const abilityFactor = clamp(0.65, 1 - abilityDelta / 260, 1.35);
    const mentalFactor = 1 - (evaluation.mental - 50) / 400;
    const jitter = 1 + (Math.random() - 0.5) * 0.16;
    return Math.max(3, base * abilityFactor * mentalFactor * jitter);
  }

  function computeElementPenalty(student, element, evaluation){
    const base = element.penaltyTimeSec;
    const tagInfo = PENALTY_LIBRARY[element.penaltyTag] || null;
    const severity = tagInfo?.penaltyMultiplier || 1.0;
    const difficultyGap = Math.max(0, element.difficulty - evaluation.abilityScore);
    const overload = 1 + difficultyGap / 140;
    const random = 1 + (Math.random() * 0.35);
    return Math.max(2, base * severity * overload * random);
  }

  function computeElementScore(element, runtime, ctx){
    const perSecond = element.scorePerSecond || ctx?.contest?.scorePerSecond || 0.2;
    const timePenalty = (runtime.timeSec || 0) * perSecond;
    const penaltyPenalty = (runtime.penaltySec || 0) * perSecond * 0.9;
    const base = element.targetScore || (ctx?.contest?.maxScore || 100) / (ctx?.contest?.trackLength || 4);
    return Math.max(0, base - timePenalty - penaltyPenalty);
  }

  function computePenaltyScoreLoss(element, penaltySec, ctx){
    const perSecond = element.scorePerSecond || ctx?.contest?.scorePerSecond || 0.2;
    return penaltySec * perSecond;
  }

  function pickPenaltyReason(element){
    if(element.failReasons && element.failReasons.length){
      return element.failReasons[Math.floor(Math.random() * element.failReasons.length)];
    }
    const tagInfo = PENALTY_LIBRARY[element.penaltyTag];
    return tagInfo ? tagInfo.description : '执行出现误差';
  }

  function checkDisqualification(element, context){
    const tagInfo = PENALTY_LIBRARY[element.penaltyTag];
    if(!tagInfo || !tagInfo.disqualifyChance) return false;
    const penaltySec = context?.runtime?.penaltySec || 0;
    if(penaltySec < element.penaltyTimeSec * 2) return false;
    return Math.random() < tagInfo.disqualifyChance;
  }

  const SmartCar = {
    GROUPS,
    GROUP_CONFIG,
    PENALTY_LIBRARY,
    getDefaultGroup,
    assignGroup,
    ensureGroup,
    mapKnowledgeToAttr,
    getTrainingKnowledgeMultiplier,
    getAbilityGainMultipliers,
    prepareContestTracks,
    evaluateElement,
    computeElementTime,
    computeElementPenalty,
    computeElementScore,
    computePenaltyScoreLoss,
    pickPenaltyReason,
    checkDisqualification
  };

  global.SmartCar = SmartCar;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
