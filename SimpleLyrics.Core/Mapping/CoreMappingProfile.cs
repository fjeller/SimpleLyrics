using Fjeller.SimpleMapper;
using SimpleLyrics.Contracts.DataObjects;
using SimpleLyrics.Contracts.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace SimpleLyrics.Core.Mapping;

/// ==============================================================================================================================
/// <summary>
/// Defines the object mapping configuration for core business logic layer.
/// </summary>
/// ==============================================================================================================================
public class CoreMappingProfile : MappingProfile
{
	/// ==============================================================================================================================
	/// <summary>
	/// Initializes a new instance of the <see cref="CoreMappingProfile"/> class.
	/// </summary>
	/// ==============================================================================================================================
	public CoreMappingProfile()
	{
		CreateMap<SongData, SongModel>();
		CreateMap<SongListItemData, SongListItemModel>();
		CreateMap<SongModel, SongData>();
	}
}
