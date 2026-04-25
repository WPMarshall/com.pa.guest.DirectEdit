
/* ==================== Math functions necessary for various stuff ==================== */

dEdit.radToDeg = function (rad) {
	try {
		return rad*(180/Math.PI);
	}
	catch(e) {
		return 0;
	}
};
dEdit.degToRad = function (deg) {
	try {
		return deg*(Math.PI/180);
	}
	catch(e) {
		return 0;
	}
};
dEdit.innerProduct = function(a,b) {
	if(a.length===b.length) {
		var s = 0;
		for(var i = 0; i < a.length; i++) {
			s += a[i]*b[i];
		}
		return s;
	}
};
dEdit.outerProduct = function(a,b) {
	// Preallocate (maybe useful?)
	var M = Array(a.length);
	for(var i = 0; i < a.length; i++) {
		M[i] = Array(b.length);
	}

	for(var i = 0; i < a.length; i++) {
		for(var j = 0; j < b.length; j++) {
			M[i][j] = a[i]*b[j];
		}
	}

	return M;
};
dEdit.columnize = function(v) {
	var A = new Array(v.length);
	for(var i = 0; i < v.length; i++) {
		A[i] = [v[i]];
	}
	return A;
};
dEdit.flatten2D = function(A) {
	
	var v = _.cloneDeep(A);
	
	if(A[0].length === 1) {
		for(var i = 0; i < A.length; i++) {
			v[i] = A[i][0];
		}
	}
	if(A.length === 1) {
		v = v[0];
	}
	
	return v;
};
dEdit.matMult = function(A,B) {
	var rowsA = A.length;
	var colsA = A[0].length;
	var rowsB = B.length;
	var colsB = B[0].length;
	if(colsA === rowsB) {
		// Preallocate
		var M = new Array(rowsA);
		for(var i = 0; i < rowsA; i++) {
			M[i] = new Array(colsB);
		}
		
		// Multiply
		for(var i = 0; i < rowsA; i++) {
			for(var j = 0; j < colsB; j++) {
				M[i][j] = 0;
				for(var k = 0; k < colsA; k++) {
					M[i][j] += A[i][k] * B[k][j];
				}
			}
		}
		
		return M;
	}
};
dEdit.vMult = function(v,d) {
	var y = new Array(v.length);
	for(var i = 0; i < v.length; i++) {
		y[i] = v[i] * d;
	}
	return y;
};
dEdit.vAdd = function(a,b) {
	if(a.length===b.length) {
		var c = new Array(a.length);
		for(var i = 0; i < a.length; i++) {
			c[i] = a[i] + b[i];
		}
		return c;
	}
};
dEdit.normalize = function(v) {
	var r = Math.sqrt(dEdit.innerProduct(v,v));
	return dEdit.vMult(v,1/r);
};

dEdit.crossProduct = function(a, b) {
	return [
		a[1]*b[2] - a[2]*b[1],
		a[2]*b[0] - a[0]*b[2],
		a[0]*b[1] - a[1]*b[0]
	];
};

// Reflect vector v through the plane with given normal (passing through origin)
dEdit.reflectVector = function(v, normal) {
	var d = dEdit.innerProduct(v, normal) / dEdit.innerProduct(normal, normal);
	return dEdit.vAdd(v, dEdit.vMult(normal, -2 * d));
};

// Compute the 3x3 rotation matrix that maps [0,0,1] to the unit vector n.
// This matches the engine's Quatf::fromVecToVec(Z, position) used in CsgBrushPreview::updateTransform.
dEdit.frameFromZToDir = function(n) {
	// Handle the case where n is already Z (north pole)
	var r_xy = Math.sqrt(n[0]*n[0] + n[1]*n[1]);
	if (r_xy < 1e-8) {
		if (n[2] > 0) {
			// n ≈ +Z, rotation is identity
			return [[1,0,0],[0,1,0],[0,0,1]];
		} else {
			// n ≈ -Z, match engine fallback: 180° rotation about Y
			return [[-1,0,0],[0,1,0],[0,0,-1]];
		}
	}

	// Rodrigues rotation formula: axis = normalize(cross(Z, n)), angle = acos(nz)
	// axis = [-ny/r_xy, nx/r_xy, 0]
	// Using sin(angle) = r_xy, cos(angle) = nz, 1-cos = 1-nz
	// Simplified with (1-nz)/r_xy^2 = 1/(1+nz) since r_xy^2 = 1-nz^2 = (1-nz)(1+nz)
	var f = 1.0 / (1.0 + n[2]); // = (1 - cos) / sin^2
	var nx = n[0], ny = n[1], nz = n[2];

	return [
		[1 - nx*nx*f,    -nx*ny*f,   nx],
		[  -nx*ny*f,   1 - ny*ny*f,  ny],
		[  -nx,           -ny,        nz]
	];
};

// Multiply a 3x3 matrix M by a 3-vector v
dEdit.matVecMult3 = function(M, v) {
	return [
		M[0][0]*v[0] + M[0][1]*v[1] + M[0][2]*v[2],
		M[1][0]*v[0] + M[1][1]*v[1] + M[1][2]*v[2],
		M[2][0]*v[0] + M[2][1]*v[1] + M[2][2]*v[2]
	];
};

// Transpose a 3x3 matrix (inverse for rotation matrices)
dEdit.transpose3 = function(M) {
	return [
		[M[0][0], M[1][0], M[2][0]],
		[M[0][1], M[1][1], M[2][1]],
		[M[0][2], M[1][2], M[2][2]]
	];
};

// Compute the world-space orientation direction of a brush given its stored parameters.
// This reconstructs what the engine does: Q(n) * [cos(rot), sin(rot), 0],
// then if mirrored, flip the z component (Scale(1,1,-1) effect).
dEdit.getWorldOrientation = function(pos, rotation, mirrored) {
	var n = dEdit.normalize(pos);
	var Q = dEdit.frameFromZToDir(n);
	var localDir = [Math.cos(rotation), Math.sin(rotation), 0];
	var worldDir = dEdit.matVecMult3(Q, localDir);
	if (mirrored) {
		worldDir[2] = -worldDir[2];
	}
	return worldDir;
};

// Given a new stored position and mirrored flag, find the rotation angle that produces
// the desired world-space orientation direction.
dEdit.solveRotation = function(pos, mirrored, desiredWorldDir) {
	var n = dEdit.normalize(pos);
	var Q = dEdit.frameFromZToDir(n);
	var QT = dEdit.transpose3(Q);
	var target = desiredWorldDir;
	if (mirrored) {
		target = [target[0], target[1], -target[2]];
	}
	var localDir = dEdit.matVecMult3(QT, target);
	return Math.atan2(localDir[1], localDir[0]);
};

console.log("[DirectEdit] Vector math loaded");