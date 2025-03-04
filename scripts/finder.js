import { mt_n_get } from './be_random.js';
import { get_structure_config, Vec2i } from './types.js';
import { get_cong_with_module, scala_down, scala_up } from './utils.js';

export class AreaCandidate {
  constructor(areaPos, seed) {
    this.area_pos = areaPos;
    this.candidate_area_seed = seed;
  }
}

export function cal_candidate_seed(p, salt) {
  return ((salt - 245998635 * p.z - 1724254968 * p.x) >>> 0);
}

export class StructureFinder {
  constructor(searchCenter, range, type) {
    this.config_ = get_structure_config(type);
    
    const chunkPosCenter = scala_down(searchCenter, 16);
    this.center_ = scala_down(chunkPosCenter, this.config_.spacing);
    
    let radius = Math.floor(range / 16 / this.config_.spacing);
    radius = radius < 1 ? 1 : radius;
    if (range % (16 * this.config_.spacing) !== 0) {
      radius++;
    }
    this.radius_ = radius;
    
    const size = (2 * this.radius_ + 1) * (2 * this.radius_ + 1);
    this.areas_ = new Array(size);
    
    const salt = this.config_.salt;
    let idx = 0;
    
    for (let i = -this.radius_; i <= this.radius_; i++) {
      for (let j = -this.radius_; j <= this.radius_; j++) {
        const areaPos = new Vec2i(this.center_.x + i, this.center_.z + j);
        const seed = cal_candidate_seed(areaPos, salt);
        this.areas_[idx++] = new AreaCandidate(areaPos, seed);
      }
    }
  }    
  
  find_candidate_positions(seed) {
    const positions = [];
    const areas = this.areas_;
    
    for (let i = 0; i < areas.length; i++) {
        const area = areas[i];
        const pos = this.get_candidate_pos_in_area(
            area.area_pos, 
            (area.candidate_area_seed + seed) >>> 0
        );
        
        if (pos) {
            positions.push(pos);
        }
    }
    
    return positions;
  }

  get_candidate_pos_in_area(p, areaSeed) {
    const config = this.config_;
    
    if (config.num !== 2 && config.num !== 4) {
      throw new Error("Configuration number must be 2 or 4");
    }
    
    const box = scala_up(p, config.spacing);
    const mt = mt_n_get(areaSeed, config.num);
    
    if (!mt || mt.length < config.num) {
      return null;
    }
    
    const separation = config.separation;
    const r1 = mt[0] % separation;
    const r2 = mt[1] % separation;
    
    let avgX, avgZ;
    
    if (config.num === 2) {
      avgX = r1;
      avgZ = r2;
    } else {
      const r3 = mt[2] % separation;
      const r4 = mt[3] % separation;
      
      avgX = (r1 + r2) >> 1;
      avgZ = (r3 + r4) >> 1;
    }

    const i = get_cong_with_module(box.min.x << 4, config.spacing << 4, avgX << 4);
    const j = get_cong_with_module(box.min.z << 4, config.spacing << 4, avgZ << 4);
            
    return new Vec2i(i, j);
  }
}