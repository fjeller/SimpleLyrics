using Fjeller.SimpleMapper;
using SimpleLyrics.Contracts.DataObjects;
using SimpleLyrics.Contracts.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace SimpleLyrics.Core.Mapping;

public class CoreMappingProfile : MappingProfile
{
	public CoreMappingProfile()
	{
		CreateMap<SongData, SongModel>();
		CreateMap<SongListItemData, SongListItemModel>();
		CreateMap<SongModel, SongData>();
	}
}
