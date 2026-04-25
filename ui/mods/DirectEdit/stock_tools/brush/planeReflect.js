dEdit.api.registerBrushTool(
	{
		label: "Reflect through plane",
		description: "Reflect the brush across the plane normal to the input vector.",

		activeFields: {
			vec_direction: "Normal vector"
		},

		getFunction: function(fields) {
			var fn = {};
			fn.planeVector = fields.vec_direction;

			fn.applyTo = function(brushSpec) {
				var cl = _.cloneDeep(brushSpec);

				// Save old state for orientation computation
				var oldPos = cl.position.slice();
				var oldRot = cl.rotation;
				var oldMirrored = cl.mirrored;

				// Reflect position through the plane
				var p = dEdit.innerProduct(cl.position,fn.planeVector) / dEdit.innerProduct(fn.planeVector,fn.planeVector);
				cl.position = dEdit.vAdd(cl.position,dEdit.vMult(fn.planeVector,-2*p));

				// Toggle mirrored (reflection reverses handedness)
				cl.mirrored = ! cl.mirrored;
				// Negate z to compensate for the mirrored toggle (keeps brush in same visual hemisphere)
				cl.position[2] = -cl.position[2];

				// Compute correct rotation by tracking how the orientation reflects
				var oldWorldDir = dEdit.getWorldOrientation(oldPos, oldRot, oldMirrored);
				var newWorldDir = dEdit.reflectVector(oldWorldDir, fn.planeVector);
				cl.rotation = dEdit.solveRotation(cl.position, cl.mirrored, newWorldDir);

				return cl;
			};

			return fn;
		}
	}
);
