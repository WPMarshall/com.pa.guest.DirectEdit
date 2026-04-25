dEdit.api.registerBrushTool(
	{
		label: "Rotate about axis",
		description: "Rotate this brush a certain number of degrees about a certain axis.",

		activeFields: {
			vec_direction: "Axis",
			num_angle: "Angle (deg)"
		},

		getFunction: function(fields) {
			var fn = {};

			fn.axis = fields.vec_direction;
			fn.angle = dEdit.degToRad(fields.num_angle); // This should be passed in as degrees

			// Make rotation matrix (Rodrigues formula)
			fn.axisNormal = dEdit.vMult(fn.axis,1/Math.sqrt(dEdit.innerProduct(fn.axis,fn.axis)));

			var u = fn.axisNormal; // just a pointer
			var c = Math.cos(fn.angle);
			var s = Math.sin(fn.angle);
			fn.matrix = [ [c + u[0]*u[0]*(1-c),       u[0]*u[1]*(1-c) - u[2]*s,  u[0]*u[2]*(1-c) + u[1]*s],
			              [u[1]*u[0]*(1-c) + u[2]*s,  c + u[1]*u[1]*(1-c),       u[1]*u[2]*(1-c) - u[0]*s],
						  [u[2]*u[0]*(1-c) - u[1]*s,  u[2]*u[1]*(1-c) + u[0]*s,  c + u[2]*u[2]*(1-c)     ] ];

			fn.applyTo = function(brushSpec) {
				var cl = _.cloneDeep(brushSpec);

				// Save old state for orientation computation
				var oldPos = cl.position.slice();
				var oldRot = cl.rotation;

				// Rotate position
				cl.position = dEdit.flatten2D(dEdit.matMult(fn.matrix,dEdit.columnize(cl.position)));

				// Compute correct rotation by tracking how the tangent frame changes
				var oldWorldDir = dEdit.getWorldOrientation(oldPos, oldRot, cl.mirrored);
				var newWorldDir = dEdit.matVecMult3(fn.matrix, oldWorldDir);
				cl.rotation = dEdit.solveRotation(cl.position, cl.mirrored, newWorldDir);

				return cl;
			};

			return fn;
		}
	}
);
